// ============================================================
// PRESENTATION
// Renderizado y eventos de UI
// Firma: ZETA
// ============================================================

import {
  GROUPS,
  MONTHS,
  SHORT_MONTHS,
  getMonthKey,
  shiftMonth,
  getMonthLabel,
  getToday,
  formatMoney,
  getPayments,
  getTotalPaid,
  getPaymentStatus,
  calculateStats,
} from "../domain/domain.js";
import {
  LocalStorageRepository,
  DepartmentRepository,
  PaymentRepository,
  WaterPaymentRepository,
  CookieActivityRepository,
  exportPaymentsExcel,
} from "../infrastructure/storage.js";
import {
  DepartmentService,
  PaymentService,
  createStatusReader,
} from "../application/services.js";

const app = document.querySelector("#app");

const storage = new LocalStorageRepository();
storage.copyGroupData("virreyes", "soli");
const activityRepository = new CookieActivityRepository();
const departmentService = new DepartmentService(
  new DepartmentRepository(storage),
);
const paymentService = new PaymentService(
  new PaymentRepository(storage),
);
const waterPaymentRepository = new WaterPaymentRepository(storage);

const state = {
  group: null,
  departments: [],
  month: getMonthKey(),
  payments: {},
  waterPayments: {},
  tab: "dashboard",
  error: "",
  form: null,
};

function recordActivity(action, details = "") {
  activityRepository.record(action, state.group || "", details);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

function getGroupName() {
  return GROUPS.find(group => group[0] === state.group)?.[1] || "";
}

function icon(name, className = "") {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z"/><path d="M8 21h8"/>',
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    payments: '<path d="M4 7h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><path d="M16 12h5M3 10h13a2 2 0 0 0 2-2V5H6a3 3 0 0 0-3 3v2Z"/><circle cx="8" cy="14" r="1"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M2 21h20M8 7h2M8 11h2M8 15h2M12 7h2M12 11h2M12 15h2"/>',
    units: '<path d="M4 20V9l8-6 8 6v11"/><path d="M8 20v-6h8v6M2 20h20"/><path d="M12 7h.01"/>',
    money: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.6-.6-1.6-1-3-1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.4-.4-3-1M12 5v14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    warning: '<path d="m12 3 9 17H3L12 3Z"/><path d="M12 9v4M12 16h.01"/>',
  };

  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.home}</svg>`;
}

function loadGroup() {
  state.departments = departmentService.getAll(state.group);
  loadPayments();
}

function loadPayments() {
  state.payments = paymentService.getAll(state.group, state.month);
  state.waterPayments = waterPaymentRepository.getAll(
    state.group,
    state.month,
  );
}

function saveAll() {
  departmentService.repository.save(state.group, state.departments);
  paymentService.repository.save(
    state.group,
    state.month,
    state.payments,
  );
}

function render() {
  if (!state.group) {
    app.innerHTML = renderGroupScreen();
    bindEvents();
    return;
  }

  loadGroup();

  const stats = calculateStats(
    state.departments,
    state.payments,
    state.month,
  );

  const title = {
    dashboard: "Dashboard",
    tabla: "Tabla del mes",
    departamentos: "Departamentos",
  }[state.tab];

  app.innerHTML = `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <div class="logo">${icon("home")}</div>
          <strong>${getGroupName()}</strong>
        </div>

        <div class="menu-title">MENÚ</div>

        <nav class="nav">
          ${renderNavigation()}
        </nav>
      </aside>

      <main class="main">
        <header class="topbar">
          <div>
            <div class="title">${title}</div>
            <div class="subtitle">
              ${
                state.tab === "departamentos"
                  ? `${state.departments.length} unidades registradas`
                  : getMonthLabel(state.month)
              }
            </div>
          </div>

          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn card" data-switch-group>
              ↩ Cambiar grupo
            </button>
            <div class="avatar">AD</div>
          </div>
        </header>

        ${
          state.error
            ? `
              <div class="error">
                ${escapeHtml(state.error)}
                <button class="btn" data-clear-error>cerrar</button>
              </div>
            `
            : ""
        }

        ${
          state.tab === "dashboard"
            ? renderDashboard(stats)
            : state.tab === "tabla"
              ? renderTable()
              : renderDepartments()
        }

        <div class="footer">
          ${getGroupName()} · los datos se guardan automáticamente en este navegador.
        </div>
      </main>
    </div>
  `;

  bindEvents();
}

function renderGroupScreen() {
  return `
    <div class="group-screen">
      <div class="group-box">
        <div class="logo logo-large" style="margin:0 auto 18px">${icon("home")}</div>
        <h1>Andrade Departamentos</h1>
        <p>Selecciona el grupo de departamentos que deseas administrar</p>

        <div class="group-cards">
          ${GROUPS.map(group => `
            <button class="card group-card" data-group="${group[0]}">
              <div class="group-icon">${icon("building")}</div>
              <strong>${group[1]}</strong>
              <div class="small">Entrar al registro</div>
            </button>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderNavigation() {
  const items = [
    ["dashboard", "dashboard", "Dashboard"],
    ["tabla", "payments", "Tabla del mes"],
    ["departamentos", "building", "Departamentos"],
  ];

  return items.map(([id, icon, label]) => `
    <button
      class="${state.tab === id ? "active" : ""}"
      data-tab="${id}"
    >
      ${iconMarkup(icon, "nav-icon")}<span>${label}</span>
    </button>
  `).join("");
}

function iconMarkup(name, className = "") {
  return icon(name, className);
}

function renderDashboard(stats) {
  const points = getChartData();
  const max = Math.max(
    stats.expected,
    ...points.map(point => point.collected),
    1,
  );

  return `
    <section class="stats">
      ${[
        ["units", "Unidades totales", state.departments.length, "var(--blue)"],
        ["money", "Recaudado este mes", formatMoney(stats.collected), "var(--green)"],
        ["clock", "Por cobrar", formatMoney(Math.max(stats.expected - stats.collected, 0)), "var(--yellow)"],
        ["warning", "Atrasados", stats.late, "var(--red)"],
      ].map(item => `
        <div class="card stat">
          <div class="stat-icon" style="color:${item[3]}">${icon(item[0])}</div>
          <div class="stat-value">${item[2]}</div>
          <div class="muted">${item[1]}</div>
        </div>
      `).join("")}
    </section>

    <section class="charts">
      <div class="card chart-card">
        <div class="chart-head">
          <div>
            <div class="chart-title">Recaudación mensual</div>
            <div class="small">Últimos 6 meses</div>
          </div>

          <div class="legend">
            ● Recaudado
            <span style="color:var(--soft)">● Esperado</span>
          </div>
        </div>

        <div class="chart">
          <div class="bars">
            ${points.map(point => `
              <div class="bar-group">
                <div
                  class="bar expected"
                  style="height:${stats.expected / max * 100}%"
                  title="Esperado: ${formatMoney(stats.expected)}"
                ></div>

                <div
                  class="bar"
                  style="height:${point.collected / max * 100}%"
                  title="${formatMoney(point.collected)}"
                ></div>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="labels">
          ${points.map(point => `
            <span>${SHORT_MONTHS[Number(point.month.slice(5)) - 1]}</span>
          `).join("")}
        </div>
      </div>

      <div class="card chart-card">
        <div class="chart-title">Estado del mes</div>
        <div class="small">${getMonthLabel(state.month)}</div>

        <div class="status-list">
          ${[
            ["paid", "Pagado", "var(--green)", stats.paid],
            ["partial", "Parcial", "var(--yellow)", stats.partial],
            ["late", "Atrasado", "var(--red)", stats.late],
            ["pending", "Pendiente", "var(--soft)", stats.pending],
          ].map(item => `
            <div class="status-row">
              <span>
                <i class="dot" style="background:${item[2]}"></i>
                <span class="muted">${item[1]}</span>
              </span>
              <b>${item[3]}</b>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function getChartData() {
  const months = [];

  for (let i = 5; i >= 0; i--) {
    months.push(shiftMonth(state.month, -i));
  }

  return months.map(month => {
    const payments = paymentService.getAll(state.group, month);
    const collected = Object.values(payments)
      .reduce((sum, payment) => sum + getTotalPaid(payment), 0);

    return { month, collected };
  });
}

function renderTable() {
  return `
    ${state.form?.payment ? renderPaymentForm(state.form.payment) : ""}

    <div class="toolbar">
      <button class="btn card" data-month="-1">‹</button>
      <span class="month">${getMonthLabel(state.month)}</span>
      <button class="btn card" data-month="1">›</button>
      <button class="btn primary" data-export>⇩ Descargar Excel</button>
    </div>

    <div class="card table-wrap">
      ${
        state.departments.length
          ? `
            <table class="table">
              <thead>
                <tr>
                  <th>DEPTO</th>
                  <th>INQUILINO</th>
                  <th>RENTA</th>
                  <th>ESTADO</th>
                  <th>AGUA</th>
                  <th>ABONADO</th>
                  <th>SALDO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                ${state.departments.map(department => {
                  const payment = state.payments[department.id];
                  const status = getPaymentStatus(
                    department,
                    payment,
                    state.month,
                  );
                  const paid = getTotalPaid(payment);

                  return `
                    <tr>
                      <td><b>${escapeHtml(department.numero)}</b></td>
                      <td class="muted">
                        ${escapeHtml(department.inquilino) || "—"}
                      </td>
                      <td>${formatMoney(department.renta)}</td>
                      <td>
                        <span class="badge ${status.className}">
                          ${status.label}
                        </span>
                      </td>
                      <td>
                        <label class="water-check" title="${state.waterPayments[department.id] ? "Desmarcar pago de agua" : "Marcar pago de agua"}">
                          <input
                            type="checkbox"
                            data-water="${department.id}"
                            ${state.waterPayments[department.id] ? "checked" : ""}
                          >
                          <span>${state.waterPayments[department.id] ? "Pagada" : "Pendiente"}</span>
                        </label>
                      </td>
                      <td>${formatMoney(paid)}</td>
                      <td>
                        ${formatMoney(Math.max(department.renta - paid, 0))}
                      </td>
                      <td>
                        <button
                          class="btn primary"
                          data-pay="${department.id}"
                        >
                          Registrar pago
                        </button>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          `
          : `
            <div class="empty">
              Agrega tu primer departamento para empezar a registrar pagos.
            </div>
          `
      }
    </div>
  `;
}

function renderDepartments() {
  return `
    <div class="toolbar" style="justify-content:flex-end">
      <button class="btn primary" data-new>
        ＋ Agregar departamento
      </button>
    </div>

    ${
      state.form
        ? renderDepartmentForm()
        : state.departments.length
          ? `
            <div class="card table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>DEPTO</th>
                    <th>INQUILINO</th>
                    <th>RENTA</th>
                    <th>DÍA DE PAGO</th>
                    <th>GRACIA</th>
                    <th>ACCIÓN</th>
                  </tr>
                </thead>

                <tbody>
                  ${state.departments.map(department => `
                    <tr>
                      <td><b>${escapeHtml(department.numero)}</b></td>
                      <td class="muted">
                        ${escapeHtml(department.inquilino) || "—"}
                      </td>
                      <td>${formatMoney(department.renta)}</td>
                      <td>día ${department.diaPago}</td>
                      <td>${department.diasGracia || 0} días</td>
                      <td class="actions">
                        <button data-edit="${department.id}">Editar</button>
                        <button
                          class="danger"
                          data-delete="${department.id}"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          `
          : `
            <div class="card empty">
              Agrega tu primer departamento para empezar a registrar pagos.
            </div>
          `
    }
  `;
}

function renderDepartmentForm() {
  const form = state.form;

  const fields = [
    ["numero", "NÚMERO / NOMBRE", "text", "Depto 3B"],
    ["inquilino", "INQUILINO", "text", "Nombre"],
    ["renta", "RENTA MENSUAL", "number", "4500"],
    ["diaPago", "DÍA DE PAGO", "number", "5"],
    ["diasGracia", "DÍAS DE GRACIA", "number", "5"],
  ];

  return `
    <div class="card form">
      <div class="chart-title" style="margin-bottom:13px">
        ${form.id ? "Editar" : "Nuevo"} departamento
      </div>

      <div class="form-grid">
        ${fields.map(field => `
          <div class="field">
            <label>${field[1]}</label>
            <input
              class="input"
              name="${field[0]}"
              type="${field[2]}"
              value="${escapeHtml(form[field[0]])}"
              placeholder="${field[3]}"
            >
          </div>
        `).join("")}

        <button class="btn primary" data-save-dept>Guardar</button>
        <button class="btn" data-cancel>Cancelar</button>
      </div>
    </div>
  `;
}

function renderPaymentForm(departmentId) {
  const department = state.departments.find(
    item => item.id === departmentId,
  );

  const payment = state.payments[departmentId];
  const paid = getTotalPaid(payment);

  return `
    <div class="card form">
      <div class="chart-title">
        Registrar abono · ${escapeHtml(department.numero)}
      </div>

      <div class="small">
        Renta: ${formatMoney(department.renta)}
        · Abonado: ${formatMoney(paid)}
        · Saldo: ${formatMoney(Math.max(department.renta - paid, 0))}
      </div>

      <div class="payment-form" style="margin-top:14px">
        <div class="field">
          <label>MONTO</label>
          <input
            class="input"
            id="amount"
            type="number"
            value="${Math.max(department.renta - paid, 0)}"
          >
        </div>

        <div class="field">
          <label>FECHA</label>
          <input
            class="input"
            id="date"
            type="date"
            value="${getToday()}"
          >
        </div>

        <div class="field notes">
          <label>NOTAS</label>
          <input
            class="input"
            id="notes"
            placeholder="Opcional"
          >
        </div>

        <button
          class="btn primary"
          data-add-payment="${departmentId}"
        >
          Guardar abono
        </button>

        <button class="btn" data-cancel>Cancelar</button>
      </div>

      ${getPayments(payment).map(item => `
        <div class="history">
          ${item.fecha || ""} · ${formatMoney(item.monto)}
          ${escapeHtml(item.notas)}

          <button
            class="btn danger"
            data-remove="${departmentId}|${item.id}"
          >
            Eliminar
          </button>
        </div>
      `).join("")}
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-group]").forEach(button => {
    button.onclick = () => {
      state.group = button.dataset.group;
      state.tab = "dashboard";
      state.form = null;
      state.error = "";
      recordActivity("seleccionar_grupo");
      render();
    };
  });

  document.querySelector("[data-switch-group]")?.addEventListener(
    "click",
    () => {
      recordActivity("cambiar_grupo");
      state.group = null;
      state.form = null;
      state.departments = [];
      state.payments = {};
      state.waterPayments = {};
      render();
    },
  );

  document.querySelectorAll("[data-tab]").forEach(button => {
    button.onclick = () => {
      state.tab = button.dataset.tab;
      state.form = null;
      recordActivity("cambiar_seccion", state.tab);
      render();
    };
  });

  document.querySelectorAll("[data-month]").forEach(button => {
    button.onclick = () => {
      state.month = shiftMonth(
        state.month,
        Number(button.dataset.month),
      );
      recordActivity("cambiar_mes", state.month);
      render();
    };
  });

  document.querySelectorAll("[data-water]").forEach(checkbox => {
    checkbox.onchange = () => {
      const departmentId = checkbox.dataset.water;
      const paid = checkbox.checked;

      waterPaymentRepository.setPaid(
        state.group,
        state.month,
        departmentId,
        paid,
      );
      checkbox.parentElement.querySelector("span").textContent = paid
        ? "Pagada"
        : "Pendiente";
      checkbox.parentElement.title = paid
        ? "Desmarcar pago de agua"
        : "Marcar pago de agua";
      recordActivity(paid ? "marcar_agua_pagada" : "desmarcar_agua_pagada", departmentId);
    };
  });

  document.querySelector("[data-export]")?.addEventListener(
    "click",
    () => {
      const statusReader = createStatusReader(
        state.departments,
        state.payments,
        state.month,
      );

      exportPaymentsExcel(
        state.departments,
        state.payments,
        statusReader,
        state.month,
        state.waterPayments,
        getGroupName(),
      );
      recordActivity("exportar_csv", state.month);
    },
  );

  document.querySelector("[data-new]")?.addEventListener(
    "click",
    () => {
      state.form = {
        numero: "",
        inquilino: "",
        renta: "",
        diaPago: 5,
        diasGracia: 5,
      };
      recordActivity("abrir_nuevo_departamento");
      render();
    },
  );

  document.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      const department = state.departments.find(
        item => item.id === button.dataset.edit,
      );

      state.form = { ...department };
      recordActivity("editar_departamento", department.numero);
      render();
    };
  });

  document.querySelectorAll("[data-delete]").forEach(button => {
    button.onclick = () => {
      if (!confirm("¿Eliminar este departamento?")) {
        return;
      }

      departmentService.delete(
        state.group,
        button.dataset.delete,
      );

      recordActivity("eliminar_departamento", button.dataset.delete);

      render();
    };
  });

  document.querySelectorAll("[data-pay]").forEach(button => {
    button.onclick = () => {
      state.tab = "tabla";
      state.form = { payment: button.dataset.pay };
      recordActivity("abrir_registro_pago", button.dataset.pay);
      render();
    };
  });

  document.querySelector("[data-save-dept]")?.addEventListener(
    "click",
    saveDepartment,
  );

  document.querySelector("[data-add-payment]")?.addEventListener(
    "click",
    addPayment,
  );

  document.querySelectorAll("[data-remove]").forEach(button => {
    button.onclick = () => {
      const [departmentId, paymentId] =
        button.dataset.remove.split("|");

      paymentService.remove(
        state.group,
        state.month,
        departmentId,
        paymentId,
      );

      recordActivity("eliminar_abono", departmentId);

      render();
    };
  });

  document.querySelectorAll("[data-cancel]").forEach(button => {
    button.onclick = () => {
      state.form = null;
      recordActivity("cancelar_formulario");
      render();
    };
  });

  document.querySelector("[data-clear-error]")?.addEventListener(
    "click",
    () => {
      state.error = "";
      render();
    },
  );
}

function saveDepartment() {
  const form = state.form;

  const values = {
    ...form,
    numero: document.querySelector("[name=numero]").value,
    inquilino: document.querySelector("[name=inquilino]").value,
    renta: document.querySelector("[name=renta]").value,
    diaPago: document.querySelector("[name=diaPago]").value,
    diasGracia: document.querySelector("[name=diasGracia]").value,
  };

  try {
    departmentService.save(state.group, values);
    recordActivity(form.id ? "actualizar_departamento" : "crear_departamento", values.numero);
    state.form = null;
    state.error = "";
  } catch (error) {
    state.error = error.message;
  }

  render();
}

function addPayment() {
  const departmentId = state.form.payment;

  try {
    paymentService.add(
      state.group,
      state.month,
      departmentId,
      {
        amount: Number(document.querySelector("#amount").value),
        date: document.querySelector("#date").value,
        notes: document.querySelector("#notes").value,
      },
    );

    recordActivity("registrar_abono", departmentId);

    state.error = "";
  } catch (error) {
    state.error = error.message;
  }

  render();
}

recordActivity("abrir_aplicacion");
render();

// ------------------------------------------------------------
// Hecho por ZETA
// Arquitectura separada por dominio, aplicación, infraestructura
// y presentación sin cambiar el propósito original del sistema.
// ------------------------------------------------------------
