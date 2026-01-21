const addPromptBtn = document.getElementById("addPromptBtn");
const categoriesContainer = document.getElementById("categoriesContainer");
const addPromptModal = document.getElementById("addPromptModal");
const closeModal = document.getElementById("closeModal");
const manualForm = document.getElementById("manualForm");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const csvFile = document.getElementById("csvFile");
const tabBtns = document.querySelectorAll(".tab-btn");
const promptCategorySelect = document.getElementById("promptCategory");
const newCategoryInput = document.getElementById("newCategoryInput");

let data = {
};

// Load data from Chrome storage on startup
function loadData() {
    chrome.storage.sync.get(["prompts"], (result) => {
        if (result.prompts) {
            data = result.prompts;
        }
        renderCategories();
    });
}

// Save data to Chrome storage
function saveData() {
    chrome.storage.sync.set({ prompts: data });
}

function updateCategoryDropdown() {
    const currentValue = promptCategorySelect.value;
    promptCategorySelect.innerHTML = '<option value="">Select or create category</option>';
    
    Object.keys(data).forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        promptCategorySelect.appendChild(option);
    });
    
    const addNewOption = document.createElement("option");
    addNewOption.value = "___ADD_NEW___";
    addNewOption.textContent = "+ Add New Category";
    promptCategorySelect.appendChild(addNewOption);
    
    if (currentValue) {
        promptCategorySelect.value = currentValue;
    }
}

function renderCategories() {
    categoriesContainer.innerHTML = "";

    const hasData = Object.keys(data).length > 0 && Object.values(data).some(arr => arr.length > 0);
    
    if (!hasData) {
        categoriesContainer.innerHTML = '<div class="empty-state"><div class="empty-state-message">No prompts found</div></div>';
        return;
    }

    Object.keys(data).forEach((categoryName) => {
        const categoryDiv = document.createElement("div");
        categoryDiv.className = "category";

        const header = document.createElement("div");
        header.className = "category-header";
        const headerSpan = document.createElement("span");
        headerSpan.textContent = categoryName;
        const arrowSpan = document.createElement("span");
        arrowSpan.className = "arrow";
        arrowSpan.textContent = "▶";
        header.appendChild(headerSpan);
        header.appendChild(arrowSpan);

        const promptsDiv = document.createElement("div");
        promptsDiv.className = "prompts";

        data[categoryName].forEach(item => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "prompt-item";
            
            // Create title element
            const titleDiv = document.createElement("div");
            titleDiv.className = "prompt-title";
            titleDiv.textContent = item.title;
            itemDiv.appendChild(titleDiv);
            
            // Create prompt element (hidden by default, shown on hover)
            const promptDiv = document.createElement("div");
            promptDiv.className = "prompt-content";
            promptDiv.textContent = item.prompt;
            promptDiv.style.display = "none";
            itemDiv.appendChild(promptDiv);
            
            // Show prompt on hover, copy on click
            itemDiv.addEventListener("mouseenter", () => {
                titleDiv.style.display = "none";
                promptDiv.style.display = "block";
            });
            
            itemDiv.addEventListener("mouseleave", () => {
                titleDiv.style.display = "block";
                promptDiv.style.display = "none";
            });
            
            itemDiv.addEventListener("click", () => {
                navigator.clipboard.writeText(item.prompt).then(() => {
                    const originalTitle = titleDiv.textContent;
                    titleDiv.textContent = "Copied!";
                    titleDiv.style.display = "block";
                    promptDiv.style.display = "none";
                    setTimeout(() => {
                        titleDiv.textContent = originalTitle;
                    }, 1500);
                }).catch(err => {
                    alert("Failed to copy: " + err);
                });
            });
            
            promptsDiv.appendChild(itemDiv);
        });

        header.addEventListener("click", () => {
            categoryDiv.classList.toggle("open");
        });

        categoryDiv.appendChild(header);
        categoryDiv.appendChild(promptsDiv);
        categoriesContainer.appendChild(categoryDiv);
    });
}

// Modal Functions
function openModal() {
    addPromptModal.classList.add("show");
    updateCategoryDropdown();
    newCategoryInput.style.display = "none";
}

function closeModalFn() {
    addPromptModal.classList.remove("show");
    manualForm.reset();
    csvFile.value = "";
    newCategoryInput.style.display = "none";
}

// Category dropdown change handler
promptCategorySelect.addEventListener("change", () => {
    if (promptCategorySelect.value === "___ADD_NEW___") {
        newCategoryInput.style.display = "block";
        newCategoryInput.focus();
        promptCategorySelect.value = "";
    } else {
        newCategoryInput.style.display = "none";
    }
});

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        
        tabBtns.forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
        
        btn.classList.add("active");
        document.getElementById(tabName).classList.add("active");
    });
});

// Manual form submission
manualForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const title = document.getElementById("promptTitle").value.trim();
    const prompt = document.getElementById("promptText").value.trim();
    let category = promptCategorySelect.value.trim();
    
    if (newCategoryInput.style.display !== "none") {
        category = newCategoryInput.value.trim();
    }
    
    if (!title || !prompt) {
        alert("Please fill all fields");
        return;
    }
    
    if (!category) {
        alert("Please select or create a category");
        return;
    }
    
    if (!data[category]) {
        data[category] = [];
    }
    
    data[category].push({ title, prompt });
    saveData();
    renderCategories();
    closeModalFn();
    alert("Prompt added successfully!");
});

// CSV upload
uploadCsvBtn.addEventListener("click", () => {
    if (!csvFile.files.length) {
        alert("Please select a CSV file");
        return;
    }
    
    const file = csvFile.files[0];
    
    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
        alert("File size must be less than 1MB");
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        try {
            const csv = e.target.result;
            const lines = csv.split("\n");
            let addedCount = 0;
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const parts = lines[i].split(",").map(s => s.trim());
                if (parts.length < 3) continue;
                
                let title = parts[0];
                let prompt = parts[1];
                let category = parts[2];
                
                // Validate inputs
                if (!title || !prompt || !category) continue;
                if (title.length > 200 || prompt.length > 5000 || category.length > 100) continue;
                
                if (!data[category]) {
                    data[category] = [];
                }
                
                data[category].push({ title, prompt });
                addedCount++;
            }
            
            if (addedCount === 0) {
                alert("No valid prompts found in CSV");
                return;
            }
            
            saveData();
            renderCategories();
            closeModalFn();
            alert(`Added ${addedCount} prompts successfully!`);
        } catch (error) {
            alert("Error parsing CSV file. Make sure it has columns: title,prompt,category");
        }
    };
    
    reader.readAsText(file);
});

// Event listeners
addPromptBtn.addEventListener("click", openModal);
closeModal.addEventListener("click", closeModalFn);

addPromptModal.addEventListener("click", (e) => {
    if (e.target === addPromptModal) {
        closeModalFn();
    }
});

// Load data from storage on startup
loadData();
