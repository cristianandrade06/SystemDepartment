// ============================================================
// DOMAIN
// Andrade Departamentos
// Firma: ZETA
// ============================================================

export const GROUPS = [
  ["sanjudas", "DEPARTAMENTOS SANJUDAS"],
  ["encinos", "DEPARTAMENTOS ENCINOS"],
  ["soli", "DEPARTAMENTOS SOLI"],
];

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const SHORT_MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function formatMoney(value) {
  return (Number(value) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

export function getPayments(payment) {
  if (Array.isArray(payment?.abonos)) {
    return payment.abonos;
  }

  // Compatibilidad con el formato anterior.
  if (payment?.pagado) {
    return [{
      id: "legacy",
      monto: payment.monto,
      fecha: payment.fecha,
      notas: payment.notas || "",
    }];
  }

  return [];
}

export function getTotalPaid(payment) {
  return getPayments(payment).reduce(
    (total, item) => total + (Number(item.monto) || 0),
    0,
  );
}

export function getPaymentStatus(department, payment, currentMonth, today = new Date()) {
  const paid = getTotalPaid(payment);
  const rent = Number(department.renta) || 0;

  if (paid >= rent && rent > 0) {
    return { label: "Pagado", className: "paid" };
  }

  if (paid > 0) {
    return { label: "Parcial", className: "partial" };
  }

  const currentDateMonth = getMonthKey(today);
  const graceDays = Number(department.diasGracia) || 0;
  const paymentDay = Number(department.diaPago) || 1;

  const isLate =
    currentMonth < currentDateMonth ||
    (currentMonth === currentDateMonth &&
      today.getDate() > paymentDay + graceDays);

  return isLate
    ? { label: "Atrasado", className: "late" }
    : { label: "Pendiente", className: "pending" };
}

export function calculateStats(departments, payments, currentMonth) {
  const stats = {
    paid: 0,
    partial: 0,
    late: 0,
    pending: 0,
    collected: 0,
    expected: 0,
  };

  for (const department of departments) {
    const payment = payments[department.id];
    const status = getPaymentStatus(department, payment, currentMonth);

    const key = {
      Pagado: "paid",
      Parcial: "partial",
      Atrasado: "late",
      Pendiente: "pending",
    }[status.label];

    stats[key]++;
    stats.collected += getTotalPaid(payment);
    stats.expected += Number(department.renta) || 0;
  }

  return stats;
}
