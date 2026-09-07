// ============================================================
// INFRASTRUCTURE
// Persistencia local y exportación
// Firma: ZETA
// ============================================================

export class LocalStorageRepository {
  constructor(storage = window.localStorage) {
    this.storage = storage;
  }

  get(key, fallback = null) {
    const value = this.storage.getItem(key);

    if (!value) {
      return fallback;
    }

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  set(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }

  remove(key) {
    this.storage.removeItem(key);
  }

  copyGroupData(fromGroup, toGroup) {
    const sourcePrefix = `${fromGroup}::`;
    const targetPrefix = `${toGroup}::`;

    for (let index = 0; index < this.storage.length; index++) {
      const key = this.storage.key(index);

      if (!key?.startsWith(sourcePrefix)) {
        continue;
      }

      const targetKey = `${targetPrefix}${key.slice(sourcePrefix.length)}`;

      if (this.storage.getItem(targetKey) === null) {
        this.storage.setItem(targetKey, this.storage.getItem(key));
      }
    }
  }
}

export class CookieActivityRepository {
  constructor(cookieName = "andrade_activity", maxEntries = 30) {
    this.cookieName = cookieName;
    this.maxEntries = maxEntries;
  }

  getAll() {
    const prefix = `${this.cookieName}=`;
    const raw = document.cookie
      .split("; ")
      .find(cookie => cookie.startsWith(prefix))
      ?.slice(prefix.length);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(decodeURIComponent(raw)) || [];
    } catch {
      return [];
    }
  }

  record(action, group = "", details = "") {
    const entry = {
      at: new Date().toISOString(),
      action,
      group,
      details,
    };
    let entries = [entry, ...this.getAll()].slice(0, this.maxEntries);
    let value = encodeURIComponent(JSON.stringify(entries));

    while (value.length > 3800 && entries.length > 1) {
      entries = entries.slice(0, -1);
      value = encodeURIComponent(JSON.stringify(entries));
    }

    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${this.cookieName}=${value}; max-age=31536000; path=/; SameSite=Lax${secure}`;
  }
}

export class DepartmentRepository {
  constructor(storage) {
    this.storage = storage;
  }

  getKey(group) {
    return `${group}::departamentos`;
  }

  getAll(group) {
    return this.storage.get(this.getKey(group), []);
  }

  save(group, departments) {
    this.storage.set(this.getKey(group), departments);
  }
}

export class PaymentRepository {
  constructor(storage) {
    this.storage = storage;
  }

  getKey(group, month) {
    return `${group}::pagos:${month}`;
  }

  getAll(group, month) {
    return this.storage.get(this.getKey(group, month), {});
  }

  save(group, month, payments) {
    this.storage.set(this.getKey(group, month), payments);
  }

  remove(group, month) {
    this.storage.remove(this.getKey(group, month));
  }
}

export class WaterPaymentRepository {
  constructor(storage) {
    this.storage = storage;
  }

  getKey(group, month) {
    return `${group}::agua:${month}`;
  }

  getAll(group, month) {
    return this.storage.get(this.getKey(group, month), {});
  }

  setPaid(group, month, departmentId, paid) {
    const waterPayments = this.getAll(group, month);

    if (paid) {
      waterPayments[departmentId] = true;
    } else {
      delete waterPayments[departmentId];
    }

    this.storage.set(this.getKey(group, month), waterPayments);
  }
}

function escapeSpreadsheetHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

export function exportPaymentsExcel(
  departments,
  payments,
  getStatus,
  month,
  waterPayments = {},
  groupName = "",
) {
  const rows = departments.map((department, index) => {
    const paid = getStatus.total(department.id);
    const status = getStatus.label(department.id);
    const statusClass = {
      Pagado: "paid",
      Parcial: "partial",
      Atrasado: "late",
      Pendiente: "pending",
    }[status] || "pending";

    return `
      <tr class="${index % 2 ? "alternate" : ""}">
        <td>${escapeSpreadsheetHtml(department.numero)}</td>
        <td>${escapeSpreadsheetHtml(department.inquilino || "—")}</td>
        <td class="money">$${Number(department.renta || 0).toLocaleString("es-MX")}</td>
        <td><span class="status ${statusClass}">${status}</span></td>
        <td><span class="water ${waterPayments[department.id] ? "water-paid" : "water-pending"}">${waterPayments[department.id] ? "Pagada" : "Pendiente"}</span></td>
        <td class="money">$${paid.toLocaleString("es-MX")}</td>
        <td class="money">$${Math.max(Number(department.renta) - paid, 0).toLocaleString("es-MX")}</td>
      </tr>`;
  }).join("");

  const spreadsheet = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; color: #172033; }
          h1 { color: #244a8f; font-size: 20px; margin-bottom: 4px; }
          p { color: #64748b; margin-top: 0; }
          table { border-collapse: collapse; min-width: 820px; border: 1px solid #cbd5e1; }
          th { background: #244a8f; color: white; padding: 11px 14px; border: 1px solid #17366f; text-align: left; }
          td { padding: 10px 14px; border: 1px solid #dbe3ef; background: #ffffff; }
          tr.alternate td { background: #eef4ff; }
          .money { text-align: right; white-space: nowrap; }
          .status { font-weight: bold; padding: 5px 10px; border-radius: 12px; }
          .water { font-weight: bold; }
          .water-paid { color: #137333; }
          .water-pending { color: #b42318; }
          .paid { color: #137333; background: #d9f5e5; }
          .partial { color: #946200; background: #fff0c7; }
          .late { color: #b42318; background: #ffe0e0; }
          .pending { color: #586579; background: #e7ebf1; }
        </style>
      </head>
      <body>
        <h1>Reporte de pagos · ${escapeSpreadsheetHtml(groupName)}</h1>
        <p>Periodo: ${escapeSpreadsheetHtml(month)}</p>
        <table>
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Inquilino</th>
              <th>Renta</th>
              <th>Estado</th>
              <th>Agua</th>
              <th>Total abonado</th>
              <th>Saldo pendiente</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;

  const link = document.createElement("a");
  link.href = URL.createObjectURL(
    new Blob(["\ufeff", spreadsheet], { type: "application/vnd.ms-excel" }),
  );
  link.download = `andrade_renta_${month}.xls`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
