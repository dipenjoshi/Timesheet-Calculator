// IndexedDB Helper Functions
const DB_NAME = 'TimeCardDB';
const STORE_EMPLOYEES = 'employees';
const STORE_TIME_ENTRIES = 'timeEntries';
// Increment DB_VERSION to trigger onupgradeneeded if the store was not created
const DB_VERSION = 2;

let db; // Global variable for IndexedDB instance

/**
 * Opens the IndexedDB database and creates object stores if necessary.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('IndexedDB upgrade needed.');
            if (!db.objectStoreNames.contains(STORE_EMPLOYEES)) {
                // Create employees store with hourlyRate
                db.createObjectStore(STORE_EMPLOYEES, { keyPath: 'id', autoIncrement: true });
            }
            // Recreate timeEntries store to change index
            if (db.objectStoreNames.contains(STORE_TIME_ENTRIES)) {
                db.deleteObjectStore(STORE_TIME_ENTRIES);
            }
            const timeEntriesStore = db.createObjectStore(STORE_TIME_ENTRIES, { keyPath: 'id', autoIncrement: true });
            timeEntriesStore.createIndex('employeeId', 'employeeId', { unique: false });
            // New index for employeeId and full date string
            timeEntriesStore.createIndex('employeeIdAndDate', ['employeeId', 'date'], { unique: true });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
            reject(event.target.error);
        };
    });
};

/**
 * Adds an item to a specified IndexedDB object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} item - The item to add.
 * @returns {Promise<number>} A promise that resolves with the ID of the added item.
 */
const addItemDB = (storeName, item) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * Updates an item in a specified IndexedDB object store.
 * @param {string} storeName - The name of the object store.
 * @param {object} item - The item to update (must contain keyPath).
 * @returns {Promise<void>} A promise that resolves when the item is updated.
 */
const updateItemDB = (storeName, item) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * Deletes an item from a specified IndexedDB object store by ID.
 * @param {string} storeName - The name of the object store.
 * @param {*} id - The ID of the item to delete.
 * @returns {Promise<void>} A promise that resolves when the item is deleted.
 */
const deleteItemDB = (storeName, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * Retrieves all items from a specified IndexedDB object store.
 * @param {string} storeName - The name of the object store.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of items.
 */
const getAllItemsDB = (storeName) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * Retrieves items from timeEntries store by employeeId and a date range.
 * @param {number} employeeId - The ID of the employee.
 * @param {string} startDate - The start date (YYYY-MM-DD) for the range.
 * @param {string} endDate - The end date (YYYY-MM-DD) for the range.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of time entries.
 */
const getTimeEntriesByEmployeeIdAndDateRangeDB = (employeeId, startDate, endDate) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_TIME_ENTRIES], 'readonly');
        const store = transaction.objectStore(STORE_TIME_ENTRIES);
        const index = store.index('employeeIdAndDate');

        // Use a key range for the compound index
        const range = IDBKeyRange.bound([employeeId, startDate], [employeeId, endDate]);
        const request = index.getAll(range);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};

/**
 * Retrieves a single time entry by employeeId and date.
 * @param {number} employeeId - The ID of the employee.
 * @param {string} date - The specific date (YYYY-MM-DD).
 * @returns {Promise<object|undefined>} The time entry or undefined if not found.
 */
const getSingleTimeEntryDB = (employeeId, date) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_TIME_ENTRIES], 'readonly');
        const store = transaction.objectStore(STORE_TIME_ENTRIES);
        const index = store.index('employeeIdAndDate');
        const request = index.get([employeeId, date]);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
};


/**
 * Deletes all time entries for a given employee ID.
 * @param {number} employeeId - The ID of the employee whose time entries to delete.
 * @returns {Promise<void>} A promise that resolves when deletion is complete.
 */
const deleteTimeEntriesByEmployeeIdDB = (employeeId) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_TIME_ENTRIES], 'readwrite');
        const store = transaction.objectStore(STORE_TIME_ENTRIES);
        const index = store.index('employeeId');
        const request = index.openCursor(IDBKeyRange.only(employeeId));

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                resolve();
            }
        };
        request.onerror = (event) => reject(event.target.error);
    });
};


// Global state variables
let employees = [];
let selectedEmployeeId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let timeEntriesForMonth = {}; // Stores all time entries for the currently displayed month (for quick lookup)

// Selection state
let isMouseDown = false;
let startCellDate = null;
let selectedDates = []; // Array ofYYYY-MM-DD strings for selected cells

// DOM Elements
const employeeSelect = document.getElementById('employee-select');
const addEmployeeBtn = document.getElementById('add-employee-btn');
const editEmployeeBtn = document.getElementById('edit-employee-btn');
const deleteEmployeeBtn = document.getElementById('delete-employee-btn');
const calendarBody = document.getElementById('calendar-body');
const overallTotalHoursSpan = document.getElementById('overall-total-hours'); // This element is now unused in the main view
const currentMonthYearDisplay = document.getElementById('current-month-year');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');

// Modals
const addEmployeeModal = document.getElementById('add-employee-modal');
const newEmployeeNameInput = document.getElementById('new-employee-name');
const newEmployeeHourlyRateInput = document.getElementById('new-employee-hourly-rate');
const confirmAddEmployeeBtn = document.getElementById('confirm-add-employee');
const cancelAddEmployeeBtn = document.getElementById('cancel-add-employee');

const editEmployeeModal = document.getElementById('edit-employee-modal');
const editEmployeeNameInput = document.getElementById('edit-employee-name');
const editEmployeeHourlyRateInput = document.getElementById('edit-employee-hourly-rate');
const saveEditEmployeeBtn = document.getElementById('save-edit-employee');
const cancelEditEmployeeBtn = document.getElementById('cancel-edit-employee');

const timeEntryModal = document.getElementById('time-entry-modal');
const modalDateDisplay = document.getElementById('modal-date-display');
const modalDateInput = document.getElementById('modal-date');
const modalStartTimeInput = document.getElementById('modal-start-time');
const modalStartAmPmSelect = document.getElementById('modal-start-ampm');
const modalEndTimeInput = document = document.getElementById('modal-end-time');
const modalEndAmPmSelect = document.getElementById('modal-end-ampm');
const punchInBtn = document.getElementById('punch-in-btn');
const punchOutBtn = document.getElementById('punch-out-btn');
const saveTimeEntryBtn = document.getElementById('save-time-entry');
const cancelTimeEntryBtn = document.getElementById('cancel-time-entry');

const summaryModal = document.getElementById('summary-modal');
const modalSummaryDateRange = document.getElementById('modal-summary-date-range');
const modalSummaryTotalHours = document.getElementById('modal-summary-total-hours');
const modalSummaryIncomeEarned = document.getElementById('modal-summary-income-earned');
const closeSummaryModalBtn = document.getElementById('close-summary-modal');
const printSummaryBtn = document.getElementById('print-summary-btn');

const confirmationModal = document.getElementById('confirmation-modal');
const confirmationMessage = document.getElementById('confirmation-message');
const confirmActionBtn = document.getElementById('confirm-action');
const cancelActionBtn = document.getElementById('cancel-action');
let confirmCallback = null;

// Color palette definitions with CSS variables
const colorPalettes = [
    { name: 'indigo', light: '#e0e7ff', medium: '#818cf8', dark: '#6366f1', darkest: '#4f46e5' },
    { name: 'blue', light: '#dbeafe', medium: '#60a5fa', dark: '#3b82f6', darkest: '#2563eb' },
    { name: 'purple', light: '#f3e8ff', medium: '#d8b4fe', dark: '#a855f7', darkest: '#9333ea' },
    { name: 'pink', light: '#fbf0f9', medium: '#f472b6', dark: '#ec4899', darkest: '#db2777' },
    { name: 'red', light: '#fee2e2', medium: '#f87171', dark: '#ef4444', darkest: '#dc2626' },
    { name: 'orange', light: '#fed7aa', medium: '#fb923c', dark: '#f97316', darkest: '#ea580c' },
    { name: 'green', light: '#dcfce7', medium: '#86efac', dark: '#22c55e', darkest: '#16a34a' },
    { name: 'cyan', light: '#cffafe', medium: '#22d3ee', dark: '#06b6d4', darkest: '#0891b2' },
    { name: 'teal', light: '#ccfbf1', medium: '#2dd4bf', dark: '#14b8a6', darkest: '#0d9488' },
    { name: 'violet', light: '#ede9fe', medium: '#c4b5fd', dark: '#a78bfa', darkest: '#8b5cf6' }
];

/**
 * Gets a random color palette.
 * @returns {object} A color palette object with name and color values.
 */
const getRandomColorPalette = () => {
    return colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
};

/**
 * Applies the theme based on the employee's color palette.
 * @param {string} colorName - The name of the color palette.
 */
const applyEmployeeTheme = (colorName) => {
    const palette = colorPalettes.find(p => p.name === colorName);
    if (!palette) return;

    const root = document.documentElement;
    root.style.setProperty('--btn-primary-bg', palette.dark);
    root.style.setProperty('--btn-primary-hover', palette.darkest);
    root.style.setProperty('--focus-ring-color', palette.dark);
    root.style.setProperty('--accent-light-bg', palette.light);
    root.style.setProperty('--accent-border', palette.dark);
};

/**
 * Shows a custom modal using Bootstrap Modal API.
 * @param {HTMLElement} modalElement - The modal element to show.
 */
const showModal = (modalElement) => {
    const bootstrapModal = new bootstrap.Modal(modalElement);
    bootstrapModal.show();
};

/**
 * Hides a custom modal using Bootstrap Modal API.
 * @param {HTMLElement} modalElement - The modal element to hide.
 */
const hideModal = (modalElement) => {
    const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
    if (bootstrapModal) {
        bootstrapModal.hide();
    }
};

/**
 * Shows a confirmation modal with a message and callback.
 * @param {string} message - The message to display.
 * @param {function} callback - The function to call if confirmed.
 */
const showConfirmationModal = (message, callback) => {
    confirmationMessage.textContent = message;
    confirmCallback = callback;
    showModal(confirmationModal);
};

/**
 * Updates the previous and next month button text to show month names.
 */
const updateMonthButtons = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Calculate previous month
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
    }
    prevMonthBtn.textContent = `< ${monthNames[prevMonth]}`;

    // Calculate next month
    let nextMonth = currentMonth + 1;
    let nextYear = currentYear;
    if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
    }
    nextMonthBtn.textContent = `${monthNames[nextMonth]} >`;
};

/**
 * Populates the employee dropdown with data from the `employees` array.
 */
const renderEmployeesDropdown = () => {
    employeeSelect.innerHTML = ''; // Clear existing options
    if (employees.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No employees yet. Add one!';
        employeeSelect.appendChild(option);
        employeeSelect.disabled = true;
        editEmployeeBtn.disabled = true;
        deleteEmployeeBtn.disabled = true;
        // If no employees, ensure calendar is cleared and message is shown
        calendarBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">Please add an employee to get started.</td></tr>';
        // overallTotalHoursSpan.textContent = '0.00'; // No longer needed in main view
        selectedEmployeeId = null; // Ensure no employee is selected
        return;
    }

    employeeSelect.disabled = false;
    editEmployeeBtn.disabled = false;
    deleteEmployeeBtn.disabled = false;

    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.name;
        employeeSelect.appendChild(option);
    });

    // Set selected employee: prioritize existing selection, then first employee
    if (selectedEmployeeId && employees.some(emp => emp.id === selectedEmployeeId)) {
        employeeSelect.value = selectedEmployeeId;
    } else if (employees.length > 0) {
        selectedEmployeeId = employees[0].id;
        employeeSelect.value = selectedEmployeeId;
    } else {
        selectedEmployeeId = null; // Should not happen if employees.length > 0
    }
    renderMonthView(); // Render time card for the selected employee
};

/**
 * Clears all selected date cell styles.
 */
const clearSelectionStyles = () => {
    document.querySelectorAll('.date-cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
};

/**
 * Applies selected styles to specified date cells.
 * @param {string[]} dates - Array ofYYYY-MM-DD date strings to select.
 */
const applySelectionStyles = (dates) => {
    clearSelectionStyles();
    dates.forEach(dateStr => {
        const cell = calendarBody.querySelector(`td[data-date="${dateStr}"]`);
        if (cell) {
            cell.classList.add('selected');
        }
    });
};

/**
 * Gets an array of date strings between two dates (inclusive), within the current month.
 * @param {string} date1Str - First date string (YYYY-MM-DD).
 * @param {string} date2Str - Second date string (YYYY-MM-DD).
 * @returns {string[]} Array of date strings.
 */
const getDatesInRange = (date1Str, date2Str) => {
    const dates = [];
    // Parse date strings into components to ensure local time interpretation
    const [y1, m1, d1] = date1Str.split('-').map(Number);
    const [y2, m2, d2] = date2Str.split('-').map(Number);

    let dStart = new Date(y1, m1 - 1, d1); // Month is 0-indexed
    let dEnd = new Date(y2, m2 - 1, d2);   // Month is 0-indexed

    if (dStart.getTime() > dEnd.getTime()) {
        [dStart, dEnd] = [dEnd, dStart]; // Swap if dates are in reverse order
    }

    let currentDate = new Date(dStart);
    while (currentDate <= dEnd) {
        // Ensure we only include dates within the currently displayed month/year
        if (currentDate.getMonth() === currentMonth && currentDate.getFullYear() === currentYear) {
            dates.push(currentDate.toISOString().split('T')[0]);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
};

/**
 * Handles the mouse down event for date cell selection.
 * @param {Event} e - The mouse event.
 */
const handleMouseDown = (e) => {
    const cell = e.target.closest('.date-cell');
    if (cell && cell.dataset.date) {
        isMouseDown = true;
        startCellDate = cell.dataset.date;
        selectedDates = [startCellDate];
        applySelectionStyles(selectedDates);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
};

/**
 * Handles the mouse move event for date cell selection (during drag).
 * @param {Event} e - The mouse event.
 */
const handleMouseMove = (e) => {
    if (!isMouseDown) return;

    const cell = e.target.closest('.date-cell');
    if (cell && cell.dataset.date) {
        const currentCellDate = cell.dataset.date;
        selectedDates = getDatesInRange(startCellDate, currentCellDate);
        applySelectionStyles(selectedDates);
        // calculateSelectedTotal(); // This will update the total in the summary modal if it's open
    }
};

/**
 * Handles the mouse up event for date cell selection (end of drag).
 * @param {Event} e - The mouse event.
 */
const handleMouseUp = (e) => {
    isMouseDown = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    if (selectedDates.length > 0) {
        if (selectedDates.length === 1) {
            openTimeEntryModalForSelection();
        } else {
            openSummaryModalForSelection();
        }
    } else {
        // If no dates are selected (e.g., click on empty cell), ensure total is 0.00
        // calculateSelectedTotal(); // No longer needed as total is only in summary modal
    }
};


/**
 * Renders the calendar view for the current month and year.
 */
const renderMonthView = async () => {
    calendarBody.innerHTML = ''; // Clear existing rows
    clearSelectionStyles(); // Clear any lingering selection styles
    selectedDates = []; // Reset selected dates
    // overallTotalHoursSpan.textContent = '0.00'; // No longer needed in main view
    // calculateSelectedTotal(); // Ensure total is updated for summary modal (not needed on initial render)

    updateMonthButtons(); // Update navigation button text

    if (!selectedEmployeeId) {
        calendarBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">Select an employee to view time card or add a new one.</td></tr>';
        return;
    }

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    currentMonthYearDisplay.textContent = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Load all time entries for the current month to populate `timeEntriesForMonth`
    const monthStartDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const monthEndDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const entries = await getTimeEntriesByEmployeeIdAndDateRangeDB(selectedEmployeeId, monthStartDate, monthEndDate);
    timeEntriesForMonth = {}; // Reset
    entries.forEach(entry => {
        timeEntriesForMonth[entry.date] = entry;
    });

    const today = new Date();
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 6; i++) { // Max 6 weeks in a month view
        const row = document.createElement('tr');
        row.className = 'h-24'; // Fixed height for calendar cells

        for (let j = 0; j < 7; j++) { // 7 days a week
            const cell = document.createElement('td');
            cell.className = 'border border-gray-200 p-2 align-top date-cell';

            const dayOfMonthForCell = (i * 7) + j - startingDayOfWeek + 1;

            if (dayOfMonthForCell < 1 || dayOfMonthForCell > daysInMonth) {
                // Cells outside the current month
                cell.classList.add('bg-gray-50');
                cell.innerHTML = ''; // Clear content for non-relevant cells
            } else {
                // This cell is part of the current month
                const fullDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayOfMonthForCell).padStart(2, '0')}`;
                cell.dataset.date = fullDate;
                // Increased font size for day number
                cell.innerHTML = `<div class="text-sm font-semibold text-gray-700">${dayOfMonthForCell}</div>`;

                const entry = timeEntriesForMonth[fullDate];
                if (entry) {
                    cell.classList.add('has-entry');
                    // Increased font size for time entries
                    cell.innerHTML += `
                                <div class="text-base text-gray-600 mt-1">
                                    ${entry.startTime}${entry.startAmPm} - ${entry.endTime}${entry.endAmPm}
                                </div>
                                <div class="text-base text-gray-600">Total: ${entry.total}h</div>
                            `;
                }

                if (fullDate === todayDateString) {
                    cell.classList.add('current-day');
                }
            }
            row.appendChild(cell);
        }
        calendarBody.appendChild(row);
    }
    // Add mousedown listener to calendar body for drag selection
    calendarBody.addEventListener('mousedown', handleMouseDown);
};

/**
 * Opens the time entry modal for the currently selected dates.
 */
const openTimeEntryModalForSelection = async () => {
    if (selectedDates.length === 0) return;

    const firstDate = selectedDates[0];
    const existingEntry = await getSingleTimeEntryDB(selectedEmployeeId, firstDate);

    let dateDisplay = '';
    if (selectedDates.length === 1) {
        const [year, month, day] = firstDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day); // Create local date object
        dateDisplay = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else {
        const lastDate = selectedDates[selectedDates.length - 1];
        const [firstYear, firstMonth, firstDay] = firstDate.split('-').map(Number);
        const firstDateObj = new Date(firstYear, firstMonth - 1, firstDay); // Create local date object
        const [lastYear, lastMonth, lastDay] = lastDate.split('-').map(Number);
        const lastDateObj = new Date(lastYear, lastMonth - 1, lastDay); // Create local date object

        dateDisplay = `${firstDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    modalDateDisplay.textContent = dateDisplay;
    modalDateInput.value = firstDate;

    if (existingEntry) {
        modalStartTimeInput.value = existingEntry.startTime;
        modalStartAmPmSelect.value = existingEntry.startAmPm;
        modalEndTimeInput.value = existingEntry.endTime;
        modalEndAmPmSelect.value = existingEntry.endAmPm;
    } else {
        modalStartTimeInput.value = '';
        modalStartAmPmSelect.value = 'AM';
        modalEndTimeInput.value = '';
        modalEndAmPmSelect.value = 'PM';
    }
    showModal(timeEntryModal);
};

/**
 * Opens the summary modal for the currently selected dates.
 */
const openSummaryModalForSelection = () => {
    if (selectedDates.length === 0) return;

    // Sort selectedDates to ensure firstDateStr and lastDateStr are correct
    const sortedSelectedDates = [...selectedDates].sort((a, b) => {
        // Ensure date strings are parsed as local dates for consistent sorting
        const [yearA, monthA, dayA] = a.split('-').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const [yearB, monthB, dayB] = b.split('-').map(Number);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
    });
    const firstDateStr = sortedSelectedDates[0];
    const lastDateStr = sortedSelectedDates[sortedSelectedDates.length - 1];

    // Parse dates explicitly to avoid timezone issues with new Date(YYYY-MM-DD)
    const [firstYear, firstMonth, firstDay] = firstDateStr.split('-').map(Number);
    const firstDateObj = new Date(firstYear, firstMonth - 1, firstDay); // Month is 0-indexed

    const [lastYear, lastMonth, lastDay] = lastDateStr.split('-').map(Number);
    const lastDateObj = new Date(lastYear, lastMonth - 1, lastDay); // Month is 0-indexed

    const dateRangeDisplay = `${firstDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    modalSummaryDateRange.textContent = dateRangeDisplay;

    const totalHours = calculateSelectedTotalHoursOnly();
    modalSummaryTotalHours.textContent = totalHours.toFixed(2);

    const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
    const hourlyRate = selectedEmployee ? (selectedEmployee.hourlyRate || 0) : 0;
    const incomeEarned = (totalHours * hourlyRate).toFixed(2);
    modalSummaryIncomeEarned.textContent = `$${incomeEarned}`;

    showModal(summaryModal);
};

/**
 * Parses a time string (e.g., "8:00") and AM/PM to a Date object.
 * @param {string} timeStr - The time string (e.g., "8:00").
 * @param {string} ampm - "AM" or "PM".
 * @returns {Date|null} A Date object representing the time, or null if invalid.
 */
const parseTime = (timeStr, ampm) => {
    const [hoursStr, minutesStr] = timeStr.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (isNaN(hours) || isNaN(minutes)) {
        return null;
    }

    if (ampm === 'PM' && hours < 12) {
        hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

/**
 * Calculates the total hours for a specific date.
 * @param {object} entry - The time entry object.
 * @returns {number} The total hours for the entry.
 */
const calculateTotalHours = (entry) => {
    const startTimeObj = parseTime(entry.startTime, entry.startAmPm);
    const endTimeObj = parseTime(entry.endTime, entry.endAmPm);

    let totalMinutes = 0;
    if (startTimeObj && endTimeObj) {
        let diffMs = endTimeObj.getTime() - startTimeObj.getTime();
        if (diffMs < 0) {
            diffMs += 24 * 60 * 60 * 1000; // Handle overnight shifts
        }
        totalMinutes = diffMs / (1000 * 60);
    }
    return Math.max(0, totalMinutes / 60);
};

/**
 * Calculates the total hours for all currently selected dates.
 */
const calculateSelectedTotal = () => {
    let total = 0;
    selectedDates.forEach(dateStr => {
        const entry = timeEntriesForMonth[dateStr];
        if (entry && !isNaN(parseFloat(entry.total))) {
            total += parseFloat(entry.total);
        }
    });
    // overallTotalHoursSpan.textContent = total.toFixed(2); // No longer needed in main view
};

/**
 * Calculates and returns the total hours for all currently selected dates (raw number).
 * Used for summary modal calculations.
 */
const calculateSelectedTotalHoursOnly = () => {
    let total = 0;
    selectedDates.forEach(dateStr => {
        const entry = timeEntriesForMonth[dateStr];
        if (entry && !isNaN(parseFloat(entry.total))) {
            total += parseFloat(entry.total);
        }
    });
    return total;
};

/**
 * Handles saving a time entry from the modal.
 */
const saveTimeEntry = async () => {
    const startTime = modalStartTimeInput.value.trim();
    const startAmPm = modalStartAmPmSelect.value;
    const endTime = modalEndTimeInput.value.trim();
    const endAmPm = modalEndAmPmSelect.value;

    if (!startTime || !endTime) {
        showConfirmationModal('Start time and End time are required.', () => { });
        return;
    }

    const timeRegex = /^\d{1,2}:\d{2}$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        showConfirmationModal('Please enter times in HH:MM format (e.g., 8:00).', () => { });
        return;
    }

    for (const date of selectedDates) {
        const newEntry = {
            employeeId: selectedEmployeeId,
            date: date,
            startTime: startTime,
            startAmPm: startAmPm,
            endTime: endTime,
            endAmPm: endAmPm,
            total: '0.00'
        };

        newEntry.total = calculateTotalHours(newEntry).toFixed(2);

        try {
            const existingEntry = await getSingleTimeEntryDB(selectedEmployeeId, date);
            if (existingEntry) {
                newEntry.id = existingEntry.id;
                await updateItemDB(STORE_TIME_ENTRIES, newEntry);
            } else {
                await addItemDB(STORE_TIME_ENTRIES, newEntry);
            }
            timeEntriesForMonth[date] = newEntry;
        } catch (error) {
            console.error(`Error saving time entry for ${date}:`, error);
            showConfirmationModal(`Error saving time entry for ${date}. Please try again.`, () => { });
        }
    }

    hideModal(timeEntryModal);
    renderMonthView();
    selectedDates = [];
    // calculateSelectedTotal(); // No longer updates main view total
};

/**
 * Generates and prints the summary report.
 */
const printSummary = () => {
    const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
    if (!selectedEmployee) {
        showConfirmationModal('No employee selected for printing.', () => { });
        return;
    }

    const employeeName = selectedEmployee.name;
    const hourlyRate = selectedEmployee.hourlyRate || 0;
    const dateRangeDisplay = modalSummaryDateRange.textContent;
    const totalHours = calculateSelectedTotalHoursOnly();
    const incomeEarned = (totalHours * hourlyRate).toFixed(2);

    let entriesHtml = '';
    // Sort selectedDates to ensure chronological order in printout
    const sortedSelectedDates = [...selectedDates].sort((a, b) => {
        // Ensure date strings are parsed as local dates for consistent sorting
        const [yearA, monthA, dayA] = a.split('-').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const [yearB, monthB, dayB] = b.split('-').map(Number);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateA - dateB;
    });

    sortedSelectedDates.forEach(dateStr => {
        const entry = timeEntriesForMonth[dateStr];
        if (entry) {
            const [year, month, day] = dateStr.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day); // Create local date object
            const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            entriesHtml += `
                        <tr>
                            <td>${dateFormatted}</td>
                            <td>${entry.startTime}${entry.startAmPm}</td>
                            <td>${entry.endTime}${entry.endAmPm}</td>
                            <td class="text-right">${entry.total}h</td>
                        </tr>
                    `;
        }
    });

    // Generate the print HTML using the template function
    const printHtml = generatePrintTemplate(employeeName, dateRangeDisplay, entriesHtml, totalHours, incomeEarned);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
};

/**
 * Populates the start time field with the current time when Punch In is clicked.
 */
const punchIn = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert 24-hour format to 12-hour format
    let displayHours = hours % 12;
    if (displayHours === 0) {
        displayHours = 12;
    }

    const timeString = `${displayHours}:${minutes}`;

    modalStartTimeInput.value = timeString;
    modalStartAmPmSelect.value = ampm;
};

/**
 * Populates the end time field with the current time when Punch Out is clicked.
 */
const punchOut = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // Determine AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert 24-hour format to 12-hour format
    let displayHours = hours % 12;
    if (displayHours === 0) {
        displayHours = 12;
    }

    const timeString = `${displayHours}:${minutes}`;

    modalEndTimeInput.value = timeString;
    modalEndAmPmSelect.value = ampm;
};


/**
 * Initializes the application by loading data and setting up event listeners.
 */
const initializeApp = async () => {
    try {
        await openDB();
        employees = await getAllItemsDB(STORE_EMPLOYEES);

        // If no employees, selectedEmployeeId will remain null.
        if (employees.length > 0) {
            employees = await Promise.all(employees.map(async (emp) => {
                const hourlyRate = emp.hourlyRate !== undefined ? emp.hourlyRate : 0.00;
                let color = emp.color;

                // If employee doesn't have a color, assign one and save it
                if (!color) {
                    color = getRandomColorPalette().name;
                    const updatedEmp = { ...emp, hourlyRate, color };
                    await updateItemDB(STORE_EMPLOYEES, updatedEmp);
                }

                return { ...emp, hourlyRate, color };
            }));

            // Try to restore the last selected employee from localStorage
            const savedEmployeeId = parseInt(localStorage.getItem('selectedEmployeeId'), 10);
            if (savedEmployeeId && employees.some(emp => emp.id === savedEmployeeId)) {
                selectedEmployeeId = savedEmployeeId;
            } else {
                selectedEmployeeId = employees[0].id; // Fall back to first employee
            }

            applyEmployeeTheme(employees.find(emp => emp.id === selectedEmployeeId).color); // Apply theme for the selected employee
        } else {
            selectedEmployeeId = null; // No employees, so no employee is selected
        }

        renderEmployeesDropdown();

        employeeSelect.addEventListener('change', (event) => {
            selectedEmployeeId = parseInt(event.target.value, 10);
            localStorage.setItem('selectedEmployeeId', selectedEmployeeId);
            const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
            if (selectedEmployee) {
                applyEmployeeTheme(selectedEmployee.color);
            }
            renderMonthView();
        });

        addEmployeeBtn.addEventListener('click', () => {
            newEmployeeNameInput.value = '';
            newEmployeeHourlyRateInput.value = '';
            showModal(addEmployeeModal);
        });

        cancelAddEmployeeBtn.addEventListener('click', () => hideModal(addEmployeeModal));
        confirmAddEmployeeBtn.addEventListener('click', async () => {
            const name = newEmployeeNameInput.value.trim();
            const hourlyRate = parseFloat(newEmployeeHourlyRateInput.value) || 0.00;
            if (name) {
                const colorPalette = getRandomColorPalette();
                const newEmployeeId = await addItemDB(STORE_EMPLOYEES, { name: name, hourlyRate: hourlyRate, color: colorPalette.name });
                employees.push({ id: newEmployeeId, name: name, hourlyRate: hourlyRate, color: colorPalette.name });
                selectedEmployeeId = newEmployeeId;
                renderEmployeesDropdown();
                applyEmployeeTheme(colorPalette.name);
                hideModal(addEmployeeModal);
            } else {
                showConfirmationModal('Employee name cannot be empty.', () => { });
            }
        });

        editEmployeeBtn.addEventListener('click', () => {
            if (selectedEmployeeId) {
                const employeeToEdit = employees.find(emp => emp.id === selectedEmployeeId);
                if (employeeToEdit) {
                    editEmployeeNameInput.value = employeeToEdit.name;
                    editEmployeeHourlyRateInput.value = employeeToEdit.hourlyRate;
                    showModal(editEmployeeModal);
                }
            } else {
                showConfirmationModal('Please select an employee to edit.', () => { });
            }
        });

        cancelEditEmployeeBtn.addEventListener('click', () => hideModal(editEmployeeModal));
        saveEditEmployeeBtn.addEventListener('click', async () => {
            const updatedName = editEmployeeNameInput.value.trim();
            const updatedHourlyRate = parseFloat(editEmployeeHourlyRateInput.value) || 0.00;

            if (updatedName) {
                const employeeIndex = employees.findIndex(emp => emp.id === selectedEmployeeId);
                if (employeeIndex !== -1) {
                    const updatedEmployee = { ...employees[employeeIndex], name: updatedName, hourlyRate: updatedHourlyRate };
                    await updateItemDB(STORE_EMPLOYEES, updatedEmployee);
                    employees[employeeIndex] = updatedEmployee;
                    renderEmployeesDropdown();
                    hideModal(editEmployeeModal);
                }
            } else {
                showConfirmationModal('Employee name cannot be empty.', () => { });
            }
        });


        deleteEmployeeBtn.addEventListener('click', () => {
            if (selectedEmployeeId && employees.length > 0) { // Allow deleting even if it's the last one
                const selectedEmployee = employees.find(emp => emp.id === selectedEmployeeId);
                showConfirmationModal(`Are you sure you want to delete employee "${selectedEmployee.name}" and all their time entries?`, async () => {
                    await deleteItemDB(STORE_EMPLOYEES, selectedEmployeeId);
                    await deleteTimeEntriesByEmployeeIdDB(selectedEmployeeId);
                    employees = employees.filter(emp => emp.id !== selectedEmployeeId);
                    selectedEmployeeId = employees.length > 0 ? employees[0].id : null;
                    renderEmployeesDropdown();
                });
            } else if (employees.length === 0) {
                showConfirmationModal('No employee to delete.', () => { });
            }
        });

        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderMonthView();
        });

        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderMonthView();
        });

        saveTimeEntryBtn.addEventListener('click', saveTimeEntry);
        cancelTimeEntryBtn.addEventListener('click', () => {
            hideModal(timeEntryModal);
            clearSelectionStyles();
            selectedDates = [];
            // calculateSelectedTotal(); // No longer updates main view total
        });

        punchInBtn.addEventListener('click', punchIn);
        punchOutBtn.addEventListener('click', punchOut);

        closeSummaryModalBtn.addEventListener('click', () => {
            hideModal(summaryModal);
            clearSelectionStyles();
            selectedDates = [];
            // calculateSelectedTotal(); // No longer updates main view total
        });

        printSummaryBtn.addEventListener('click', printSummary);

        confirmActionBtn.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            hideModal(confirmationModal);
        });

        cancelActionBtn.addEventListener('click', () => {
            hideModal(confirmationModal);
        });

    }
    catch (error) {
        console.error("Failed to initialize app:", error);
        document.body.innerHTML = '<div class="min-h-screen flex items-center justify-center bg-gray-100"><p class="text-center text-red-600 text-xl">Error loading application. Please try again or check console for details.</p></div>';
    }
};

document.querySelectorAll('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
        const faqItem = button.parentElement;

        // Optional: Close other open items
        document.querySelectorAll('.faq-item').forEach(item => {
            if (item !== faqItem) item.classList.remove('active');
        });

        faqItem.classList.toggle('active');
    });
});


document.addEventListener('DOMContentLoaded', initializeApp);
