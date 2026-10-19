export const ORDER_STATUS = {
  pending: { label: "Menunggu konfirmasi", className: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "Dikonfirmasi", className: "bg-indigo-100 text-indigo-700" },
  processing: { label: "Diproses", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Selesai", className: "bg-green-100 text-green-700" },
  cancelled: { label: "Dibatalkan", className: "bg-red-100 text-red-700" },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

export const statusClass = (status: string) =>
  ORDER_STATUS[status as OrderStatus]?.className ?? "bg-gray-100 text-gray-700";