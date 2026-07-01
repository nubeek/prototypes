(function () {
  const model = window.FinancialModel;

  const inputFields = {
    essentialsNewPerMonth: document.getElementById("essentialsNewPerMonth"),
    essentialsMRR: document.getElementById("essentialsMRR"),
    premiumNewPerMonth: document.getElementById("premiumNewPerMonth"),
    premiumMRR: document.getElementById("premiumMRR"),
  };

  const applyButton = document.getElementById("applyInputs");
  const clearButton = document.getElementById("clearAllInputs");
  const loadSampleButton = document.getElementById("loadSampleValues");
  const tabButtons = document.querySelectorAll("[data-table-tab]");
  const tablePanels = document.querySelectorAll("[data-table-panel]");
  const tableSearchInput = document.getElementById("tableSearchInput");
  const tableSearchClear = document.getElementById("tableSearchClear");

  const currencyRows = {
    grossAnnualSales: document.querySelectorAll('[data-row="grossAnnualSales"]'),
    totalFranchiseExpenses: document.querySelectorAll('[data-row="totalFranchiseExpenses"]'),
    netAnnualSales: document.querySelectorAll('[data-row="netAnnualSales"]'),
    totalCostOfSales: document.querySelectorAll('[data-row="totalCostOfSales"]'),
    grossProfit: document.querySelectorAll('[data-row="grossProfit"]'),
    adjustedEbitda: document.querySelectorAll('[data-row="adjustedEbitda"]'),
    netIncome: document.querySelectorAll('[data-row="netIncome"]'),
    unleveredFcf: document.querySelectorAll('[data-row="unleveredFcf"]'),
    debtFinancing: document.querySelectorAll('[data-row="debtFinancing"]'),
    leveredFcf: document.querySelectorAll('[data-row="leveredFcf"]'),
    fcfOperator: document.querySelectorAll('[data-row="fcfOperator"]'),
    fcfPreferred: document.querySelectorAll('[data-row="fcfPreferred"]'),
    fcfTotal: document.querySelectorAll('[data-row="fcfTotal"]'),
    totalDistributionsPreferred: document.querySelectorAll('[data-row="totalDistributionsPreferred"]'),
    individualFcfPreferred: document.querySelectorAll('[data-row="individualFcfPreferred"]'),
    totalDistributionsIndividual: document.querySelectorAll('[data-row="totalDistributionsIndividual"]'),
  };

  const percentRows = {
    growthRates: document.querySelectorAll('[data-row="growthRates"]'),
    grossProfitMargin: document.querySelectorAll('[data-row="grossProfitMargin"]'),
    adjustedEbitdaMargin: document.querySelectorAll('[data-row="adjustedEbitdaMargin"]'),
    preferredEquityYield: document.querySelectorAll('[data-row="preferredEquityYield"]'),
    individualPreferredEquityYield: document.querySelectorAll('[data-row="individualPreferredEquityYield"]'),
  };

  const multipleRows = {
    dscr: document.querySelectorAll('[data-row="dscr"]'),
  };

  const complianceRows = {
    dscrCompliance: document.querySelectorAll('[data-row="dscrCompliance"]'),
  };

  function formatCurrency(value) {
    const rounded = Math.round(value);
    const absolute = Math.abs(rounded).toLocaleString("en-US");
    return rounded < 0 ? `(${absolute})` : absolute;
  }

  function formatPercent(value, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "";
    }

    return `${value.toFixed(digits)}%`;
  }

  function formatMultiple(value, digits = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "";
    }

    return `${value.toFixed(digits)}x`;
  }

  function formatCompliance(isCompliant) {
    return isCompliant ? "yes" : "no";
  }

  function setRowValues(cells, values, formatter) {
    cells.forEach((cell, index) => {
      const value = values[index];
      cell.textContent = formatter(value);
      cell.classList.toggle("negative", typeof value === "number" && value < 0);
    });
  }

  function setComplianceValues(cells, values) {
    cells.forEach((cell, index) => {
      const isCompliant = values[index];
      cell.textContent = formatCompliance(isCompliant);
      cell.classList.toggle("positive", isCompliant);
      cell.classList.toggle("negative", !isCompliant);
    });
  }

  function readInputs() {
    return {
      essentialsNewPerMonth: inputFields.essentialsNewPerMonth.value,
      essentialsMRR: inputFields.essentialsMRR.value,
      premiumNewPerMonth: inputFields.premiumNewPerMonth.value,
      premiumMRR: inputFields.premiumMRR.value,
    };
  }

  function setInputs(values) {
    inputFields.essentialsNewPerMonth.value = values.essentialsNewPerMonth ?? "";
    inputFields.essentialsMRR.value = values.essentialsMRR ?? "";
    inputFields.premiumNewPerMonth.value = values.premiumNewPerMonth ?? "";
    inputFields.premiumMRR.value = values.premiumMRR ?? "";
  }

  function setLabelTitles() {
    document
      .querySelectorAll(
        ".summary td.label, .summary th.col-label, .summary tbody td:first-child:not([colspan])"
      )
      .forEach((cell) => {
      const text = cell.textContent.trim();
      cell.title = cell.scrollWidth > cell.clientWidth ? text : "";
    });
  }

  function renderModel(results) {
    Object.entries(currencyRows).forEach(([key, cells]) => {
      setRowValues(cells, results[key], formatCurrency);
    });

    Object.entries(percentRows).forEach(([key, cells]) => {
      const digits = key === "growthRates" ? 2 : 1;
      setRowValues(cells, results[key], (value) => formatPercent(value, digits));
    });

    Object.entries(multipleRows).forEach(([key, cells]) => {
      setRowValues(cells, results[key], formatMultiple);
    });

    Object.entries(complianceRows).forEach(([key, cells]) => {
      setComplianceValues(cells, results[key]);
    });

    setLabelTitles();
  }

  function applyModel() {
    renderModel(model.compute(readInputs()));
  }

  function clearInputs() {
    setInputs({
      essentialsNewPerMonth: "",
      essentialsMRR: "",
      premiumNewPerMonth: "",
      premiumMRR: "",
    });
  }

  function loadSampleValues() {
    setInputs(model.SAMPLE_INPUTS);
    applyModel();
  }

  function getRowLabel(row) {
    const cell = row.querySelector("td.label") || row.querySelector("td");
    return cell?.textContent.trim().toLocaleLowerCase() ?? "";
  }

  function applyTableSearch(query) {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    tablePanels.forEach((panel) => {
      panel.querySelectorAll("tbody tr").forEach((row) => {
        row.hidden = Boolean(normalizedQuery) && !getRowLabel(row).includes(normalizedQuery);
      });
    });
  }

  function activateTab(tabName) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tableTab === tabName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    tablePanels.forEach((panel) => {
      panel.hidden = panel.dataset.tablePanel !== tabName;
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateTab(button.dataset.tableTab);
    });
  });

  applyButton.addEventListener("click", applyModel);
  clearButton.addEventListener("click", clearInputs);
  loadSampleButton.addEventListener("click", loadSampleValues);

  if (tableSearchInput) {
    const searchField = tableSearchInput.closest(".table-search-btn");

    tableSearchInput.addEventListener("input", () => {
      const query = tableSearchInput.value;
      searchField?.classList.toggle("is-active-search", Boolean(query.trim()));
      if (tableSearchClear) {
        tableSearchClear.hidden = !query;
      }
      applyTableSearch(query);
    });

    if (tableSearchClear) {
      tableSearchClear.addEventListener("click", () => {
        tableSearchInput.value = "";
        tableSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
        tableSearchInput.focus();
      });
    }
  }

  loadSampleValues();
  setLabelTitles();
})();
