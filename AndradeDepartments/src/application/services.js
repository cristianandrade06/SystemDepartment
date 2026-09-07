// ============================================================
// APPLICATION
// Casos de uso de la aplicación
// Firma: ZETA
// ============================================================

import {
  getPayments,
  getTotalPaid,
  getPaymentStatus,
} from "../domain/domain.js";

export class DepartmentService {
  constructor(repository) {
    this.repository = repository;
  }

  getAll(group) {
    return this.repository.getAll(group);
  }

  save(group, form) {
    if (!form.numero || !form.renta) {
      throw new Error("Ingresa al menos el número de depto y la renta.");
    }

    const departments = this.getAll(group);

    const data = {
      numero: form.numero.trim(),
      inquilino: form.inquilino.trim(),
      renta: Number(form.renta),
      diaPago: Number(form.diaPago) || 1,
      diasGracia: Number(form.diasGracia) || 0,
    };

    if (form.id) {
      const updated = departments.map(department =>
        department.id === form.id
          ? { ...department, ...data }
          : department,
      );

      this.repository.save(group, updated);
      return;
    }

    departments.push({
      id: `d${Date.now()}`,
      ...data,
    });

    this.repository.save(group, departments);
  }

  delete(group, id) {
    const departments = this.getAll(group)
      .filter(department => department.id !== id);

    this.repository.save(group, departments);
  }
}

export class PaymentService {
  constructor(repository) {
    this.repository = repository;
  }

  getAll(group, month) {
    return this.repository.getAll(group, month);
  }

  add(group, month, departmentId, paymentData) {
    if (paymentData.amount <= 0) {
      throw new Error("El monto debe ser mayor a cero.");
    }

    const payments = this.getAll(group, month);
    const current = payments[departmentId] || {};
    const history = getPayments(current);

    payments[departmentId] = {
      ...current,
      abonos: [
        ...history,
        {
          id: `a${Date.now()}`,
          monto: paymentData.amount,
          fecha: paymentData.date,
          notas: paymentData.notes,
        },
      ],
    };

    this.repository.save(group, month, payments);
  }

  remove(group, month, departmentId, paymentId) {
    const payments = this.getAll(group, month);
    const current = payments[departmentId];

    if (!current) {
      return;
    }

    const remaining = getPayments(current)
      .filter(payment => payment.id !== paymentId);

    if (remaining.length) {
      payments[departmentId] = {
        ...current,
        abonos: remaining,
      };
    } else {
      delete payments[departmentId];
    }

    this.repository.save(group, month, payments);
  }
}

export function createStatusReader(departments, payments, month) {
  const findDepartment = id =>
    departments.find(department => department.id === id);

  return {
    total(id) {
      return getTotalPaid(payments[id]);
    },

    label(id) {
      const department = findDepartment(id);
      return getPaymentStatus(department, payments[id], month).label;
    },
  };
}
