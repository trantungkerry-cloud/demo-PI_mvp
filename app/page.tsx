"use client";

import { Fragment } from "react";
import Image from "next/image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowDownWideNarrow,
  BadgeDollarSign,
  Calculator,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Folder,
  History,
  Info,
  ListFilter,
  Lock,
  LockOpen,
  Mail,
  MessagesSquare,
  MapPin,
  MoreVertical,
  Package,
  Pencil,
  Printer,
  Plus,
  Route,
  RotateCcw,
  Search,
  Settings,
  Settings2,
  ShieldAlert,
  UsersRound,
  ShipWheel,
  ShieldPlus,
  Copy,
  Star,
  Truck,
  Trash2,
  Upload,
  Users,
  Wrench,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SidebarGroup = {
  title: string;
  open?: boolean;
  active?: boolean;
  icon: "export" | "import" | "pricing" | "operations" | "customers" | "services" | "settings" | "documents" | "shipment";
  items?: { label: string; icon: SidebarIconName; active?: boolean }[];
};

type SidebarIconName = "description" | "folder" | "history" | "settings";

type BookingRow = {
  code: string;
  customer: string;
  route: {
    from: string;
    to: string;
  };
  cargoType: string;
  packaging: string;
  status: BookingStatus;
  createdAt: string;
};

type BookingStatus = "draft" | "pending" | "confirmed" | "canceled";

type BookingEquipmentRow = {
  equipment: string;
  quantity: string;
  weight: string;
  commodity: string;
  description: string;
};

function createEmptyEquipmentRow(): BookingEquipmentRow {
  return {
    equipment: "",
    quantity: "",
    weight: "",
    commodity: "",
    description: ""
  };
}

function formatAuditTimestamp(date = new Date()) {
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const COST_CURRENCY_OPTIONS = ["VND", "USD", "EUR"] as const;

function sanitizeCostAmountInput(value: string) {
  const trimmed = value.replace(/,/g, "").replace(/[^\d.\-]/g, "");
  const isNegative = trimmed.startsWith("-");
  const unsigned = trimmed.replace(/-/g, "");
  const [rawInteger = "", ...decimalParts] = unsigned.split(".");
  const rawDecimal = decimalParts.join("");
  const integerPart = rawInteger.replace(/\D/g, "").slice(0, 18);
  const remainingDigits = Math.max(0, 18 - integerPart.length);
  const decimalPart = rawDecimal.replace(/\D/g, "").slice(0, remainingDigits);
  const hasDecimal = unsigned.includes(".") && integerPart.length < 18;
  const normalizedInteger = integerPart || (hasDecimal ? "0" : "");

  return `${isNegative ? "-" : ""}${normalizedInteger}${hasDecimal ? `.${decimalPart}` : ""}`;
}

function normalizeCostAmountForEdit(value: string) {
  return value.replace(/,/g, "");
}

function formatCostAmountDisplay(value: string) {
  if (!value) {
    return "";
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numberValue);
}

function finalizeCostAmount(value: string) {
  const normalized = normalizeCostAmountForEdit(value).trim();
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
    return { value: "", error: null as string | null };
  }

  const parsedValue = Number(normalized);
  if (!Number.isFinite(parsedValue)) {
    return { value: "", error: "Số tiền không hợp lệ." };
  }

  if (parsedValue < 0) {
    return { value: "", error: "Số tiền phải lớn hơn hoặc bằng 0." };
  }

  const roundedValue = parsedValue.toFixed(2);
  const digitCount = roundedValue.replace(".", "").replace("-", "").length;
  if (digitCount > 18) {
    return { value: "", error: "Số tiền vượt quá giới hạn decimal(18,2)." };
  }

  return { value: roundedValue, error: null as string | null };
}

function buildCostAuditValue(amount: string, currency: string) {
  return amount ? `${formatCostAmountDisplay(amount)} ${currency}` : "Trống";
}

function parseVietnameseNumber(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const normalized = value.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatVietnameseInteger(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "";
  }

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function normalizeVatRateValue(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  return normalized ? `${normalized}%` : "";
}

function recalculateCustomsDebitRow(row: CustomsCostRow): CustomsCostRow {
  const quantity = parseVietnameseNumber(row.quantity);
  const price = parseVietnameseNumber(row.price);
  const vatRate = parseVietnameseNumber(row.vatRate);
  const amountValue = quantity * price;
  const vatValue = amountValue * (vatRate / 100);
  const totalValue = amountValue + vatValue;

  return {
    ...row,
    amount: amountValue > 0 ? formatVietnameseInteger(amountValue) : "",
    vatAmount: vatValue > 0 ? formatVietnameseInteger(vatValue) : "",
    total: totalValue > 0 ? formatVietnameseInteger(totalValue) : ""
  };
}

function createInitialCustomsCostRows(tradeType: CustomsTradeType): CustomsCostRow[] {
  const importRows = [
    {
      feeName: "Phí mở tờ khai hải quan",
      quantity: "1",
      unit: "Tờ khai",
      price: "550.000",
      amount: "550.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "44.000",
      total: "594.000"
    },
    {
      feeName: "Phụ phí tờ khai nhánh",
      quantity: "2",
      unit: "Tờ khai",
      price: "350.000",
      amount: "700.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "56.000",
      total: "756.000"
    },
    {
      feeName: "Phụ phí kiểm hóa",
      quantity: "1",
      unit: "Lô hàng",
      price: "480.000",
      amount: "480.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "38.400",
      total: "518.400"
    },
    {
      feeName: "Phụ phí thông quan ngoài giờ",
      quantity: "1",
      unit: "Lần",
      price: "620.000",
      amount: "620.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "49.600",
      total: "669.600"
    },
    {
      feeName: "Phụ phí sửa tờ khai sau thông quan",
      quantity: "1",
      unit: "Tờ khai",
      price: "420.000",
      amount: "420.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "33.600",
      total: "453.600"
    },
    {
      feeName: "Phụ phí hủy tờ khai hải quan",
      quantity: "",
      unit: "",
      price: "",
      amount: "",
      currency: "VND",
      vatRate: "",
      vatAmount: "",
      total: ""
    }
  ] as const;

  const exportRows = [
    {
      feeName: "Phí mở tờ khai hải quan",
      quantity: "1",
      unit: "Tờ khai",
      price: "500.000",
      amount: "500.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "40.000",
      total: "540.000"
    },
    {
      feeName: "Phụ phí tờ khai nhánh",
      quantity: "1",
      unit: "Tờ khai",
      price: "320.000",
      amount: "320.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "25.600",
      total: "345.600"
    },
    {
      feeName: "Phụ phí kiểm hóa",
      quantity: "1",
      unit: "Lô hàng",
      price: "450.000",
      amount: "450.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "36.000",
      total: "486.000"
    },
    {
      feeName: "Phụ phí thông quan ngoài giờ",
      quantity: "",
      unit: "",
      price: "",
      amount: "",
      currency: "VND",
      vatRate: "",
      vatAmount: "",
      total: ""
    },
    {
      feeName: "Phụ phí sửa tờ khai sau thông quan",
      quantity: "1",
      unit: "Tờ khai",
      price: "390.000",
      amount: "390.000",
      currency: "VND",
      vatRate: "8%",
      vatAmount: "31.200",
      total: "421.200"
    },
    {
      feeName: "Phụ phí hủy tờ khai hải quan",
      quantity: "",
      unit: "",
      price: "",
      amount: "",
      currency: "VND",
      vatRate: "",
      vatAmount: "",
      total: ""
    }
  ] as const;

  const rows = tradeType === "import" ? importRows : exportRows;

  return rows.map((row, index) => ({
    id: `${tradeType}-cost-${index + 1}`,
    ...row,
    attachmentNames: [],
    updatedBy: row.amount ? "An Phạm" : "",
    updatedAt: row.amount ? `12/03/2026 ${String(9 + index).padStart(2, "0")}:15` : ""
  }));
}

function createInitialCustomsDocumentRows(tradeType: CustomsTradeType): CustomsDocumentRow[] {
  const importNames = [
    {
      name: "Các chứng từ khách hàng cung cấp (INV, PKL, BL, AN, DEBIT, giấy phép...)",
      mode: "ATTACHMENT_REQUIRED" as CustomsDocumentDisplayMode,
      files: []
    },
    { name: "Tờ khai hải quan", mode: "ATTACHMENT_REQUIRED" as CustomsDocumentDisplayMode, files: [] },
    { name: "Đề nghị thanh toán", mode: "DISPLAY_ONLY" as CustomsDocumentDisplayMode, files: ["De nghi thanh toan.pdf"] },
    { name: "Debit note", mode: "DISPLAY_ONLY" as CustomsDocumentDisplayMode, files: ["Debit note.pdf"] }
  ];
  const exportNames = [
    {
      name: "Các chứng từ khách hàng cung cấp (INV, PKL, BOOKING...)",
      mode: "ATTACHMENT_REQUIRED" as CustomsDocumentDisplayMode,
      files: []
    },
    { name: "Tờ khai hải quan", mode: "ATTACHMENT_REQUIRED" as CustomsDocumentDisplayMode, files: [] },
    { name: "Đề nghị thanh toán", mode: "DISPLAY_ONLY" as CustomsDocumentDisplayMode, files: ["De nghi thanh toan.pdf"] },
    { name: "Debit note", mode: "DISPLAY_ONLY" as CustomsDocumentDisplayMode, files: ["Debit note.pdf"] }
  ];

  const names = tradeType === "import" ? importNames : exportNames;

  return names.map((item, index) => ({
    id: `${tradeType}-document-${index + 1}`,
    documentName: item.name,
    displayMode: item.mode,
    fileNames: item.files,
    updatedBy: item.files.length > 0 ? "Hệ thống" : "",
    updatedAt: item.files.length > 0 ? "12/03/2026 11:08" : ""
  }));
}

function createInitialCustomsDeclarationGoods(): CustomsDeclarationGoodsItem[] {
  return [
    {
      id: "01",
      goodsCode: "87141040",
      description: "Lá côn/ 15C-E6325-00/ dùng cho xe máy Yamaha, mới 100%#&KXD",
      managementCode: "",
      quantity1: "12 PCE",
      quantity2: "12 PCE",
      invoiceValue: "83,52",
      invoiceUnitPrice: "6,96 - USD - PCE",
      taxableValue: "2.177.700,48 VND",
      taxableUnitPrice: "181.475,04 VND PCE"
    },
    {
      id: "02",
      goodsCode: "84099134",
      description: "Xy lanh/ 16S-E1310-20/ dùng cho xe máy Yamaha, mới 100%#&KXD",
      managementCode: "",
      quantity1: "600 PCE",
      quantity2: "600 PCE",
      invoiceValue: "7.392",
      invoiceUnitPrice: "12,32 - USD - PCE",
      taxableValue: "192.739.008 VND",
      taxableUnitPrice: "321.231,68 VND PCE"
    }
  ];
}

function createInitialCustomsAuditRows(tradeType: CustomsTradeType): CustomsAuditRow[] {
  return [
    {
      id: `${tradeType}-audit-1`,
      action: "Sửa chi phí",
      field: "Phí mở tờ khai hải quan",
      beforeValue: "Trống",
      afterValue: "250.000 VND",
      actor: "An Phạm",
      time: "12/03/2026 09:15"
    },
    {
      id: `${tradeType}-audit-2`,
      action: "Upload file",
      field: "Commercial Invoice",
      beforeValue: "0 file",
      afterValue: "1 file",
      actor: "An Phạm",
      time: "12/03/2026 11:08"
    },
    {
      id: `${tradeType}-audit-3`,
      action: "Sửa chi phí",
      field: "Phụ phí kiểm hóa",
      beforeValue: "Trống",
      afterValue: "500.000 VND",
      actor: "An Phạm",
      time: "12/03/2026 10:42"
    }
  ];
}

function createInitialInlandCostRows(tradeType: CustomsTradeType): InlandCostRow[] {
  const baseRows = ["Cước vận chuyển", "Phụ phí vận chuyển", "Phí lưu ca"];

  const mainPrice = tradeType === "import" ? 1800000 : 1650000;
  const surchargePrice = 350000;

  return baseRows.map((feeName, index) => ({
    id: `${tradeType}-inland-cost-${index + 1}`,
    feeName,
    quantity: "1",
    unit: tradeType === "import" ? "Chuyến" : "Lô",
    price:
      index === 0
        ? formatVietnameseInteger(mainPrice)
        : index === 1
          ? formatVietnameseInteger(surchargePrice)
          : "",
    amount:
      index === 0
        ? formatVietnameseInteger(mainPrice)
        : index === 1
          ? formatVietnameseInteger(surchargePrice)
          : "",
    currency: "VND",
    vatRate: "8",
    vatAmount:
      index === 0
        ? formatVietnameseInteger(tradeType === "import" ? 144000 : 132000)
        : index === 1
          ? formatVietnameseInteger(28000)
          : "",
    total:
      index === 0
        ? formatVietnameseInteger(tradeType === "import" ? 1944000 : 1782000)
        : index === 1
          ? formatVietnameseInteger(378000)
          : "",
    attachmentNames: [],
    updatedBy: index <= 1 ? "An Phạm" : "",
    updatedAt: index <= 1 ? "12/03/2026 13:18" : ""
  }));
}

function createInitialInlandDocumentRows(tradeType: CustomsTradeType): InlandDocumentRow[] {
  const rows =
    tradeType === "import"
      ? [
          { name: "Biên bản giao hàng", required: false, mode: "DISPLAY_ONLY" as InlandDocumentDisplayMode, files: [] },
          { name: "Debit note", required: false, mode: "DISPLAY_ONLY" as InlandDocumentDisplayMode, files: [] },
          { name: "Đề nghị thanh toán", required: false, mode: "DISPLAY_ONLY" as InlandDocumentDisplayMode, files: [] },
          {
            name: "AN tàu nội địa",
            required: false,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: []
          },
          {
            name: "BL",
            required: true,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: []
          },
          {
            name: "AN",
            required: true,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: [{ id: "inland-import-an-1", name: "arrival-notice.pdf", sizeLabel: "428 KB" }]
          },
          {
            name: "DO",
            required: false,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: []
          },
          {
            name: "EIR",
            required: false,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: []
          },
          {
            name: "Các chứng từ khác",
            required: false,
            mode: "ATTACHMENT_OPTIONAL" as InlandDocumentDisplayMode,
            files: []
          },
          {
            name: "PoB - các phiếu thu/hóa đơn chi hộ",
            required: true,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: []
          }
        ]
      : [
          { name: "Debit note", required: false, mode: "DISPLAY_ONLY" as InlandDocumentDisplayMode, files: [] },
          { name: "Đề nghị thanh toán", required: false, mode: "DISPLAY_ONLY" as InlandDocumentDisplayMode, files: [] },
          {
            name: "Booking",
            required: true,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: [{ id: "inland-export-booking-1", name: "booking-export.pdf", sizeLabel: "512 KB" }]
          },
          {
            name: "Các chứng từ khác",
            required: false,
            mode: "ATTACHMENT_OPTIONAL" as InlandDocumentDisplayMode,
            files: []
          },
          {
            name: "PoB - các phiếu thu/hóa đơn chi hộ",
            required: true,
            mode: "ATTACHMENT_REQUIRED" as InlandDocumentDisplayMode,
            files: []
          }
        ];

  return rows.map((row, index) => ({
    id: `${tradeType}-inland-document-${index + 1}`,
    documentName: row.name,
    required: row.required,
    displayMode: row.mode,
    files: row.files,
    uploadedBy: row.files.length > 0 ? "An Phạm" : "",
    uploadedAt: row.files.length > 0 ? "12/03/2026 14:02" : ""
  }));
}

function createInitialInlandAuditRows(tradeType: CustomsTradeType): InlandAuditRow[] {
  return [
    {
      id: `${tradeType}-inland-audit-1`,
      action: "Edit cost",
      target: "COST",
      beforeValue: "Trống",
      afterValue: "1.800.000 VND",
      actor: "An Phạm",
      time: "12/03/2026 13:18"
    },
    {
      id: `${tradeType}-inland-audit-2`,
      action: "Upload file",
      target: "DOCUMENT",
      beforeValue: "0 file",
      afterValue: "1 file (arrival-notice.pdf)",
      actor: "An Phạm",
      time: "12/03/2026 14:02"
    }
  ];
}

function createInitialOverseaCostRows(tradeType: CustomsTradeType): OverseaCostRow[] {
  const importRows = [
    { feeName: "EXW fee", amount: "950", emphasized: false },
    { feeName: "THC", amount: "120", emphasized: false },
    { feeName: "CIC", amount: "85", emphasized: false },
    { feeName: "Cleaning fee", amount: "", emphasized: false },
    { feeName: "Management fee", amount: "45", emphasized: false },
    { feeName: "DO fee", amount: "", emphasized: false },
    { feeName: "CFS", amount: "60", emphasized: false },
    { feeName: "Handling fee", amount: "", emphasized: false }
  ];
  const exportRows = [
    { feeName: "Ocean freight", amount: "1200", emphasized: true },
    { feeName: "DDP fee", amount: "", emphasized: false },
    { feeName: "THC", amount: "150", emphasized: false },
    { feeName: "Seal fee", amount: "15", emphasized: false },
    { feeName: "BL fee", amount: "", emphasized: false },
    { feeName: "CFS", amount: "35", emphasized: false },
    { feeName: "Handling fee", amount: "", emphasized: false }
  ];
  const rows = tradeType === "import" ? importRows : exportRows;

  return rows.map((row, index) => ({
    id: `${tradeType}-oversea-cost-${index + 1}`,
    feeName: row.feeName,
    amount: row.amount,
    currency: "VND",
    updatedBy: row.amount ? "An Phạm" : "",
    updatedAt: row.amount ? `12/03/2026 ${String(9 + index).padStart(2, "0")}:20` : "",
    emphasized: row.emphasized
  }));
}

function createInitialOverseaDocumentRows(tradeType: CustomsTradeType): OverseaDocumentRow[] {
  const rows =
    tradeType === "import"
      ? [
          { name: "Arrival notice", note: "Thông báo hàng đến từ hãng tàu", displayMode: "DISPLAY_ONLY" as const },
          { name: "Delivery order", note: "Lệnh giao hàng", displayMode: "DISPLAY_ONLY" as const },
          { name: "Debit note", note: "Chi tiết phí local charge", displayMode: "DISPLAY_ONLY" as const }
        ]
      : [
          { name: "HBL", note: "House Bill of Lading", displayMode: "DISPLAY_ONLY" as const },
          { name: "Debit note", note: "Chi tiết phí xuất khẩu", displayMode: "DISPLAY_ONLY" as const }
        ];

  return rows.map((row, index) => ({
    id: `${tradeType}-oversea-document-${index + 1}`,
    documentName: row.name,
    displayMode: row.displayMode,
    files: [],
    note: row.note,
    updatedBy: "An Phạm",
    updatedAt: "12/03/2026 12:15"
  }));
}

function createInitialOverseaAuditRows(tradeType: CustomsTradeType): OverseaAuditRow[] {
  return [
    {
      id: `${tradeType}-oversea-audit-1`,
      action: "Sửa chi phí",
      field: tradeType === "import" ? "EXW fee" : "Ocean freight",
      beforeValue: "Trống",
      afterValue: tradeType === "import" ? "950 VND" : "1200 VND",
      actor: "An Phạm",
      time: "12/03/2026 09:20"
    },
    {
      id: `${tradeType}-oversea-audit-2`,
      action: "Sửa chi phí",
      field: "THC",
      beforeValue: "Trống",
      afterValue: tradeType === "import" ? "120 VND" : "150 VND",
      actor: "An Phạm",
      time: "12/03/2026 10:05"
    }
  ];
}

type SelectOption = {
  label: string;
  value: string;
  searchText?: string;
};

type AdvancedFilterConfig = {
  key: "customers" | "originPorts" | "destinationPorts" | "cargoTypes" | "packaging";
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SelectOption[];
};

type AdvancedFilterState = Record<AdvancedFilterConfig["key"], string[]>;
type StatusFilterState = BookingStatus[];
type CustomerListFilterKey = "contacts" | "companies" | "services" | "groups" | "expiryDates";
type CustomerListFilterConfig = {
  key: CustomerListFilterKey;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SelectOption[];
};
type CustomerListFilterState = Record<CustomerListFilterKey, string[]>;
type CustomerAccountStatus = "draft" | "active" | "locked";
type CustomerSubPage = "list" | "contracts" | "services" | "shipments" | "create" | "create-contract";
type CustomerService =
  | "Ocean FCL"
  | "Ocean LCL"
  | "Air Freight"
  | "Trucking"
  | "Warehouse"
  | "Custom Clearance";
type ServiceConfigStatus = "draft" | "active";

type ServiceConfigRow = {
  service: CustomerService;
  description: string;
  customerCount: number;
  contractCount: number;
  status: ServiceConfigStatus;
};

type ServiceDetailFeeRowState = {
  feeType: string;
  unit: string;
  rate: string;
  required: boolean;
};

type CustomerCreateFormState = {
  customerName: string;
  englishName: string;
  taxId: string;
  customerGroup: string;
  customerType: string;
  services: string[];
  priority: string;
  salesperson: string;
  source: string;
  responsibleCompanies: string[];
  phone: string;
  email: string;
  website: string;
  tags: string[];
  status: CustomerAccountStatus;
  contractCode: string;
};

type CustomerCreateField = keyof CustomerCreateFormState | "services";
type CustomerCreateFormErrors = Partial<Record<CustomerCreateField, string>>;
type ContractCreateField = "customer" | "contractType" | "validFrom" | "validTo";
type ContractCreateFormErrors = Partial<Record<ContractCreateField, string>>;
type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;
type CustomsTradeType = "import" | "export";
type CustomsDebitNoteStatus =
  | "draft"
  | "pending_confirmation"
  | "pending_payment"
  | "paid"
  | "overdue"
  | "cancelled";
type CustomsCostRow = {
  id: string;
  feeName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
  currency: string;
  vatRate: string;
  vatAmount: string;
  total: string;
  attachmentNames: string[];
  isPlaceholder?: boolean;
  updatedBy: string;
  updatedAt: string;
};
type CustomsDocumentDisplayMode = "DISPLAY_ONLY" | "ATTACHMENT_REQUIRED" | "ATTACHMENT_OPTIONAL";
type CustomsDocumentRow = {
  id: string;
  documentName: string;
  displayMode: CustomsDocumentDisplayMode;
  fileNames: string[];
  updatedBy: string;
  updatedAt: string;
};
type CustomsAuditRow = {
  id: string;
  action: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  actor: string;
  time: string;
};
type CustomsDebitNoteListStatus = "approved" | "cancelled";

function mapDebitListStatusToFlowStatus(status: CustomsDebitNoteListStatus): CustomsDebitNoteStatus {
  return status === "approved" ? "pending_payment" : "cancelled";
}
type CustomsDeclarationGoodsItem = {
  id: string;
  goodsCode: string;
  description: string;
  managementCode: string;
  quantity1: string;
  quantity2: string;
  invoiceValue: string;
  invoiceUnitPrice: string;
  taxableValue: string;
  taxableUnitPrice: string;
};
type ShipmentDetailAuditRow = {
  id: string;
  action: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  actor: string;
  time: string;
};
type InlandDocumentFile = {
  id: string;
  name: string;
  sizeLabel: string;
};
type InlandDocumentDisplayMode = "DISPLAY_ONLY" | "ATTACHMENT_REQUIRED" | "ATTACHMENT_OPTIONAL";
type InlandCostRow = {
  id: string;
  feeName: string;
  quantity: string;
  unit: string;
  price: string;
  amount: string;
  currency: string;
  vatRate: string;
  vatAmount: string;
  total: string;
  attachmentNames: string[];
  updatedBy: string;
  updatedAt: string;
};
type InlandDocumentRow = {
  id: string;
  documentName: string;
  required: boolean;
  displayMode: InlandDocumentDisplayMode;
  files: InlandDocumentFile[];
  uploadedBy: string;
  uploadedAt: string;
};
type InlandAuditRow = {
  id: string;
  action: string;
  target: "COST" | "DOCUMENT";
  beforeValue: string;
  afterValue: string;
  actor: string;
  time: string;
};
type OverseaCostRow = {
  id: string;
  feeName: string;
  amount: string;
  currency: string;
  updatedBy: string;
  updatedAt: string;
  emphasized?: boolean;
};
type OverseaDocumentFile = {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
};
type OverseaDocumentRow = {
  id: string;
  documentName: string;
  displayMode: "DISPLAY_ONLY" | "ATTACHMENT";
  files: OverseaDocumentFile[];
  note: string;
  updatedBy: string;
  updatedAt: string;
};
type OverseaAuditRow = {
  id: string;
  action: string;
  field: string;
  beforeValue: string;
  afterValue: string;
  actor: string;
  time: string;
};

type ContractRow = {
  code: string;
  customer: string;
  contractCompany: string;
  services: CustomerService[];
  contractType: string;
  term: string;
  status: "draft" | "pending" | "accepted" | "active" | "expiring_soon" | "expired" | "terminated";
  signedAt: string;
};

type ContractCreateFormState = {
  code: string;
  customer: string;
  contractCompany: string;
  contractType: string;
  signedAt: string;
  validFrom: string;
  validTo: string;
  status: ContractRow["status"];
  services: string[];
  serviceItems: Record<string, string[]>;
  notes: string;
};

type ContractRateFormState = {
  fareCode: string;
  fareName: string;
  pol: string;
  pod: string;
  carrier: string;
  mod: string;
  container: string;
  rate: string;
  currency: string;
  unit: string;
  effectiveFrom: string;
  effectiveTo: string;
};

type ContractDomesticServiceFormState = {
  fareCode: string;
  fareName: string;
  pickupPoint: string;
  deliveryPoint: string;
  unit: string;
  container: string;
  currency: string;
  rate: string;
  linkedWarehouse: string;
};

type ContractCustomsFormState = {
  serviceName: string;
  unit: string;
  currency: string;
  rate: string;
  isPreset?: boolean;
};

type ContractWarehouseFormState = {
  serviceName: string;
  unit: string;
  currency: string;
  rate: string;
  isPreset?: boolean;
};

type ContractServiceFeeDraftFormState = {
  feeName: string;
  currency: string;
  rate: string;
};

type ContractDocumentFormState = {
  fileName: string;
  documentType: string;
  documentName: string;
  documentDate: string;
  uploadedBy: string;
};

type CustomerAddressFormState = {
  line1: string;
  line2: string;
  country: string;
  city: string;
  postalCode: string;
  addressType: string;
};

type CustomerContactFormState = {
  fullName: string;
  role: string;
  phone: string;
  email: string;
  department: string;
  isPrimary: boolean;
  notes: string;
};

type CustomerRouteFormState = {
  shippingDirection: string;
  transportMode: string;
  incoterm: string;
  cargoGroup: string;
  cargoDescription: string;
  hsCode: string;
  exportCountry: string;
  importCountry: string;
  pol: string;
  pod: string;
  containerType: string;
  estimatedVolume: string;
  estimatedWeight: string;
  otherRequirements: string;
};

function buildCustomerDetailWebsite(customerName: string) {
  const slug = customerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return slug ? `https://${slug.slice(0, 32)}.com` : "";
}

function buildEnglishCustomerName(customerName: string) {
  const normalizedName = customerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d");

  const replacements: Array<[RegExp, string]> = [
    [/\bCông ty TNHH\b/gi, "Limited Liability Company"],
    [/\bCong ty TNHH\b/gi, "Limited Liability Company"],
    [/\bCông ty Cổ phần\b/gi, "Joint Stock Company"],
    [/\bCong ty Co phan\b/gi, "Joint Stock Company"],
    [/\bCông ty CP\b/gi, "Joint Stock Company"],
    [/\bCong ty CP\b/gi, "Joint Stock Company"],
    [/\bCTCP\b/g, "Joint Stock Company"],
    [/\bCông ty Liên doanh\b/gi, "Joint Venture Company"],
    [/\bCong ty Lien doanh\b/gi, "Joint Venture Company"],
    [/\bTập đoàn\b/gi, "Group"],
    [/\bTap doan\b/gi, "Group"],
    [/\bTổng công ty\b/gi, "Corporation"],
    [/\bTong cong ty\b/gi, "Corporation"],
    [/\bThương Mại Quốc Tế\b/gi, "International Trading"],
    [/\bThuong Mai Quoc Te\b/gi, "International Trading"],
    [/\bXuất Nhập Khẩu\b/gi, "Import Export"],
    [/\bXuat Nhap Khau\b/gi, "Import Export"],
    [/\bChuỗi Cung Ứng\b/gi, "Supply Chain"],
    [/\bChuoi Cung Ung\b/gi, "Supply Chain"],
    [/\bPhân phối Hàng tiêu dùng\b/gi, "Consumer Goods Distribution"],
    [/\bPhan phoi Hang tieu dung\b/gi, "Consumer Goods Distribution"],
    [/\bSản xuất Công nghiệp\b/gi, "Industrial Manufacturing"],
    [/\bSan xuat Cong nghiep\b/gi, "Industrial Manufacturing"],
    [/\bNông sản Toàn cầu\b/gi, "Global Agriculture"],
    [/\bNong san Toan cau\b/gi, "Global Agriculture"],
    [/\bThiết bị Y tế\b/gi, "Medical Devices"],
    [/\bThiet bi Y te\b/gi, "Medical Devices"],
    [/\bBán lẻ Đa kênh\b/gi, "Omnichannel Retail"],
    [/\bBan le Da kenh\b/gi, "Omnichannel Retail"],
    [/\bKho vận Miền Nam\b/gi, "Southern Warehousing"],
    [/\bKho van Mien Nam\b/gi, "Southern Warehousing"],
    [/\bThương Mại Dịch Vụ\b/gi, "Trading Service"],
    [/\bThuong Mai Dich Vu\b/gi, "Trading Service"],
    [/\bVận Tải Biển\b/gi, "Ocean Transport"],
    [/\bVan Tai Bien\b/gi, "Ocean Transport"],
    [/\bVận Tải\b/gi, "Transport"],
    [/\bVan Tai\b/gi, "Transport"],
    [/\bBiển Đông\b/gi, "East Sea"],
    [/\bBien Dong\b/gi, "East Sea"],
    [/\bViệt Nam\b/gi, "Vietnam"],
    [/\bViet Nam\b/gi, "Vietnam"],
    [/\bMiền Bắc\b/gi, "Northern Region"],
    [/\bMien Bac\b/gi, "Northern Region"],
    [/\bMiền Trung\b/gi, "Central Region"],
    [/\bMien Trung\b/gi, "Central Region"],
    [/\bMiền Nam\b/gi, "Southern Region"],
    [/\bMien Nam\b/gi, "Southern Region"],
    [/\bĐông Dương\b/gi, "Indochina"],
    [/\bDong Duong\b/gi, "Indochina"],
    [/\bToàn Cầu\b/gi, "Global"],
    [/\bToan Cau\b/gi, "Global"]
  ];

  const translatedName = replacements.reduce(
    (currentName, [pattern, replacement]) => currentName.replace(pattern, replacement),
    normalizedName
  );

  return translatedName.replace(/\s+/g, " ").trim();
}

const sidebarGroups: SidebarGroup[] = [
  {
    title: "Quản lý khách hàng",
    icon: "customers",
    items: [
      { label: "Khách hàng", icon: "folder" },
      { label: "Hợp đồng", icon: "description" },
      { label: "Dịch vụ", icon: "settings" }
    ]
  },
  {
    title: "Quản lý Shipment",
    icon: "shipment"
  }
];

const tabs = ["Nháp", "Đang chờ xác nhận", "Đã xác nhận"];
const desktopTableColumns = "176px minmax(0, 1.45fr) minmax(180px, 1.05fr) 120px 180px 150px 120px 49px";
const customerTableColumns =
  "44px minmax(180px,0.92fr) minmax(320px,1.7fr) minmax(114px,0.6fr) minmax(180px,0.95fr) minmax(150px,0.85fr) 208px";
const contractTableColumns =
  "minmax(158px,1.08fr) minmax(231px,1.5fr) minmax(180px,1.05fr) minmax(255px,1.22fr) minmax(118px,0.63fr) minmax(130px,0.67fr) minmax(214px,1.05fr)";
const serviceConfigTableColumns =
  "minmax(220px,1.1fr) minmax(360px,1.9fr) 180px 180px";
const CREATE_BOOKING_CODE = "__create__";
const customerCreateStatusOptions: SelectOption[] = [
  { label: "Nháp", value: "draft" },
  { label: "Đang hoạt động", value: "active" },
  { label: "Tạm khóa", value: "locked" }
];
const customerContractCompanyOptions: SelectOption[] = [
  { label: "Chọn công ty ký hợp đồng", value: "" },
  { label: "PI Log", value: "PI Log" },
  { label: "TDB", value: "TDB" }
];
const customerGroupOptions: SelectOption[] = [
  { label: "Chọn nhóm KH", value: "" },
  { label: "Corporate", value: "Corporate" },
  { label: "Individual", value: "Individual" },
  { label: "Government", value: "Government" },
  { label: "SOE", value: "SOE" }
];
const customerTypeOptions: SelectOption[] = [
  { label: "Chọn loại KH", value: "" },
  { label: "Shipper", value: "Shipper" },
  { label: "Consignee", value: "Consignee" },
  { label: "Agent", value: "Agent" },
  { label: "Co-loader", value: "Co-loader" },
  { label: "Both (Shipper+Consignee)", value: "Both (Shipper+Consignee)" }
];
const customerCreateServiceOptions = [
  "Ocean FCL",
  "Ocean LCL",
  "Air Freight",
  "Trucking",
  "Warehouse",
  "Custom Clearance"
] as const;
const customerPriorityOptions = [
  { value: "0", label: "Thường" },
  { value: "1", label: "Quan trọng" },
  { value: "2", label: "Ưu tiên cao" },
  { value: "3", label: "VIP" }
] as const;
const customerSalespersonOptions: SelectOption[] = [
  { label: "Chọn nhân viên KD", value: "" },
  { label: "An Phạm", value: "An Phạm" },
  { label: "Nguyễn Minh Châu", value: "Nguyễn Minh Châu" },
  { label: "Trần Gia Hưng", value: "Trần Gia Hưng" },
  { label: "Lê Bảo Trân", value: "Lê Bảo Trân" }
];
const customerSourceOptions: SelectOption[] = [
  { label: "Chọn nguồn KH", value: "" },
  { label: "Referral", value: "Referral" },
  { label: "Cold Call", value: "Cold Call" },
  { label: "Exhibition", value: "Exhibition" },
  { label: "Website", value: "Website" },
  { label: "Partnership", value: "Partnership" }
];
const customerResponsibleCompanyOptions = ["PIL", "TDB"] as const;
const responsibleCompanyDirectory: Record<
  (typeof customerResponsibleCompanyOptions)[number],
  { legalName: string; taxId: string; phone: string; email: string }
> = {
  PIL: {
    legalName: "PI Log",
    taxId: "0312345678",
    phone: "02838256789",
    email: "contact@pi-logistics.vn"
  },
  TDB: {
    legalName: "TDB",
    taxId: "0309988776",
    phone: "02838451234",
    email: "support@tdb.vn"
  }
};
const customerAddressCountryOptions: SelectOption[] = [
  { label: "Việt Nam", value: "Việt Nam" },
  { label: "Singapore", value: "Singapore" },
  { label: "China", value: "China" }
];
const customerAddressProvinceOptions: Record<string, SelectOption[]> = {
  "Việt Nam": [
    { label: "Hồ Chí Minh", value: "Hồ Chí Minh" },
    { label: "Hà Nội", value: "Hà Nội" },
    { label: "Hải Phòng", value: "Hải Phòng" },
    { label: "Bình Dương", value: "Bình Dương" }
  ],
  Singapore: [
    { label: "Central Singapore", value: "Central Singapore" },
    { label: "North East", value: "North East" }
  ],
  China: [
    { label: "Shanghai", value: "Shanghai" },
    { label: "Shenzhen", value: "Shenzhen" }
  ]
};
const customerAddressTypeOptions: SelectOption[] = [
  { label: "Head Office", value: "Head Office" },
  { label: "Branch", value: "Branch" },
  { label: "Warehouse", value: "Warehouse" },
  { label: "Factory", value: "Factory" }
];
const customerContactRoleOptions: SelectOption[] = [
  { label: "Sales Contact", value: "Sales Contact" },
  { label: "Accounting", value: "Accounting" },
  { label: "Operations", value: "Operations" },
  { label: "Director", value: "Director" },
  { label: "Other", value: "Other" }
];
const customerRouteDirectionOptions: SelectOption[] = [
  { label: "Export (Xuất)", value: "Export (Xuất)" },
  { label: "Import (Nhập)", value: "Import (Nhập)" },
  { label: "Cross Trade", value: "Cross Trade" }
];
const customerRouteTransportModeOptions: SelectOption[] = [
  { label: "FCL", value: "FCL" },
  { label: "Ocean LCL", value: "Ocean LCL" },
  { label: "Air", value: "Air" },
  { label: "Truck", value: "Truck" },
  { label: "Multimodal", value: "Multimodal" }
];
const customerRouteIncotermOptions: SelectOption[] = [
  { label: "FOB", value: "FOB" },
  { label: "CIF", value: "CIF" },
  { label: "EXW", value: "EXW" },
  { label: "DAP", value: "DAP" },
  { label: "DDP", value: "DDP" },
  { label: "CFR", value: "CFR" }
];
const customerRouteCargoGroupOptions: SelectOption[] = [
  { label: "General Cargo", value: "General Cargo" },
  { label: "Dangerous Goods", value: "Dangerous Goods" },
  { label: "Reefer", value: "Reefer" },
  { label: "OOG", value: "OOG" },
  { label: "Hazardous", value: "Hazardous" }
];
const customerRouteCountryOptions: SelectOption[] = [
  { label: "Việt Nam", value: "Việt Nam" },
  { label: "Singapore", value: "Singapore" },
  { label: "Hong Kong", value: "Hong Kong" },
  { label: "China", value: "China" }
];
const customerRoutePolOptions: SelectOption[] = [
  { label: "Cát Lái", value: "Cát Lái" },
  { label: "Hải Phòng", value: "Hải Phòng" },
  { label: "Đà Nẵng", value: "Đà Nẵng" },
  { label: "Singapore", value: "Singapore" },
  { label: "HKG", value: "HKG" }
];
const customerRoutePodOptions: SelectOption[] = [
  { label: "Singapore", value: "Singapore" },
  { label: "HKG", value: "HKG" },
  { label: "Shanghai", value: "Shanghai" },
  { label: "Los Angeles", value: "Los Angeles" }
];
const customerRouteContainerTypeOptions: SelectOption[] = [
  { label: "20GP", value: "20GP" },
  { label: "40GP", value: "40GP" },
  { label: "40HC", value: "40HC" },
  { label: "45HC", value: "45HC" },
  { label: "20RF", value: "20RF" },
  { label: "LCL", value: "LCL" },
  { label: "ULD", value: "ULD" }
];
const customerSegmentOptions = [
  "VIP",
  "Strategic",
  "SME",
  "New Customer",
  "Government",
  "Export-focused"
] as const;
const contractTypeOptions: SelectOption[] = [
  { label: "Chọn loại hợp đồng", value: "" },
  { label: "Hợp đồng thương mại", value: "Hợp đồng thương mại" },
  { label: "Hợp đồng nguyên tắc", value: "Hợp đồng nguyên tắc" },
  { label: "Hợp đồng kinh tế", value: "Hợp đồng kinh tế" }
];
const contractDisplayServiceOptions = [
  "🌍 Vận tải quốc tế",
  "🚚 Vận tải nội địa",
  "📑 Thủ tục hải quan",
  "🏭 Kho bãi & phân phối",
  "🧩 Dịch vụ khác"
] as const;
type ServicePageScope = Exclude<(typeof contractDisplayServiceOptions)[number], "🧩 Dịch vụ khác">;
const servicePageMenuOptions = contractDisplayServiceOptions.filter(
  (service) => service !== "🧩 Dịch vụ khác"
) as ServicePageScope[];
const servicePageScopeOptions = ["🌍 Vận tải quốc tế"] as ServicePageScope[];
const serviceScopeCodeMap: Record<ServicePageScope, string> = {
  "🌍 Vận tải quốc tế": "VQT",
  "🚚 Vận tải nội địa": "VND",
  "📑 Thủ tục hải quan": "TTH",
  "🏭 Kho bãi & phân phối": "KBP"
};
const serviceScopeUpdatedAtMap: Record<ServicePageScope, string> = {
  "🌍 Vận tải quốc tế": "26/03/2026",
  "🚚 Vận tải nội địa": "24/03/2026",
  "📑 Thủ tục hải quan": "22/03/2026",
  "🏭 Kho bãi & phân phối": "20/03/2026"
};
const serviceItemCodeMap: Record<string, string> = {
  "FCL (Full Container Load)": "FCL",
  "LCL (Less than Container Load)": "LCL",
  "Dangerous Goods (DG)": "DGD",
  "Door-to-Door quốc tế": "D2D",
  "Trucking container": "TRC",
  "Trucking hàng lẻ": "TRL",
  "Last-mile delivery": "LMD",
  "Linehaul (liên tỉnh)": "LIN",
  "Door-to-Door nội địa": "D2D",
  "Express delivery": "EXP",
  "Khai báo hải quan xuất khẩu": "XKH",
  "Khai báo hải quan nhập khẩu": "NKH",
  "Xin giấy phép chuyên ngành": "GPL",
  "Kiểm hóa hàng hóa": "KHH",
  "Tư vấn HS code": "HSC",
  "Dịch vụ chứng từ": "CTU",
  "Lưu kho": "LKH",
  "Cross-docking": "CRD",
  "Pick & pack": "PAP",
  "Quản lý tồn kho": "QLT",
  "Phân phối hàng hóa": "PPH",
  "Dán nhãn / đóng gói lại": "DNG"
};
const serviceConfigCreators = ["An Phạm", "Linh Trần", "Huy Nguyễn", "Mai Lê"] as const;
const serviceDetailFeeUnitOptions: SelectOption[] = [
  { label: "Chọn đơn vị tính", value: "" },
  { label: "USD", value: "USD" },
  { label: "USD / container", value: "USD / container" },
  { label: "USD / CBM", value: "USD / CBM" },
  { label: "USD / shipment", value: "USD / shipment" },
  { label: "USD / kg", value: "USD / kg" },
  { label: "VND", value: "VND" },
  { label: "EUR", value: "EUR" }
];
const serviceDetailFeePresets: Record<string, ServiceDetailFeeRowState[]> = {
  "FCL (Full Container Load)": [
    { feeType: "Ocean Freight", unit: "USD / container", rate: "1200", required: true },
    { feeType: "THC", unit: "USD", rate: "150", required: true },
    { feeType: "BAF / LSS", unit: "USD", rate: "120", required: true },
    { feeType: "Documentation fee", unit: "USD", rate: "50", required: false },
    { feeType: "Seal fee", unit: "USD", rate: "15", required: false },
    { feeType: "Local charges (POL/POD)", unit: "USD", rate: "180", required: false }
  ],
  "LCL (Less than Container Load)": [
    { feeType: "Ocean Freight", unit: "USD / CBM", rate: "85", required: true },
    { feeType: "CFS fee", unit: "USD / CBM", rate: "35", required: true },
    { feeType: "THC", unit: "USD / CBM", rate: "25", required: true },
    { feeType: "BAF / LSS", unit: "USD / CBM", rate: "20", required: false },
    { feeType: "Consolidation fee", unit: "USD / shipment", rate: "30", required: false },
    { feeType: "Documentation fee", unit: "USD", rate: "45", required: false }
  ],
  "Dangerous Goods (DG)": [
    { feeType: "DG surcharge", unit: "USD", rate: "250", required: true },
    { feeType: "Special handling fee", unit: "USD", rate: "120", required: true },
    { feeType: "DG Documentation", unit: "USD", rate: "80", required: false },
    { feeType: "Inspection fee", unit: "USD", rate: "100", required: false },
    { feeType: "Emergency handling fee", unit: "USD", rate: "70", required: false }
  ],
  "Door-to-Door quốc tế": [
    { feeType: "Pickup fee", unit: "USD / shipment", rate: "95", required: true },
    { feeType: "Linehaul", unit: "USD / shipment", rate: "320", required: true },
    { feeType: "Destination delivery", unit: "USD / shipment", rate: "140", required: true },
    { feeType: "Documentation fee", unit: "USD", rate: "45", required: false }
  ]
};
const contractDisplayServiceItemOptions: Record<(typeof contractDisplayServiceOptions)[number], readonly string[]> = {
  "🌍 Vận tải quốc tế": [
    "FCL (Full Container Load)",
    "LCL (Less than Container Load)",
    "Dangerous Goods (DG)",
    "Door-to-Door quốc tế"
  ],
  "🚚 Vận tải nội địa": [
    "Trucking container",
    "Trucking hàng lẻ",
    "Last-mile delivery",
    "Linehaul (liên tỉnh)",
    "Door-to-Door nội địa",
    "Express delivery"
  ],
  "📑 Thủ tục hải quan": [
    "Khai báo hải quan xuất khẩu",
    "Khai báo hải quan nhập khẩu",
    "Xin giấy phép chuyên ngành",
    "Kiểm hóa hàng hóa",
    "Tư vấn HS code",
    "Dịch vụ chứng từ"
  ],
  "🏭 Kho bãi & phân phối": [
    "Lưu kho",
    "Cross-docking",
    "Pick & pack",
    "Quản lý tồn kho",
    "Phân phối hàng hóa",
    "Dán nhãn / đóng gói lại"
  ],
  "🧩 Dịch vụ khác": []
};
const contractInternationalServiceFeeNotes: Record<
  string,
  readonly { label: string; amount: string }[]
> = {
  "FCL (Full Container Load)": [
    { label: "Ocean Freight", amount: "1,200 USD / container" },
    { label: "THC", amount: "150 USD" },
    { label: "BAF / LSS", amount: "120 USD" },
    { label: "Documentation fee", amount: "50 USD" },
    { label: "Seal fee", amount: "15 USD" },
    { label: "Local charges (POL/POD)", amount: "180 USD" }
  ],
  "LCL (Less than Container Load)": [
    { label: "Ocean Freight", amount: "85 USD / CBM" },
    { label: "CFS fee", amount: "35 USD / CBM" },
    { label: "THC", amount: "25 USD / CBM" },
    { label: "BAF / LSS", amount: "20 USD / CBM" },
    { label: "Consolidation fee", amount: "30 USD / shipment" },
    { label: "Documentation fee", amount: "45 USD" }
  ],
  "Air Freight": [
    { label: "Air Freight", amount: "3.5 USD / kg" },
    { label: "Fuel surcharge", amount: "0.8 USD / kg" },
    { label: "Security surcharge", amount: "0.3 USD / kg" },
    { label: "Handling fee", amount: "60 USD" },
    { label: "AWB fee", amount: "40 USD" },
    { label: "Screening fee", amount: "25 USD" }
  ],
  "Dangerous Goods (DG)": [
    { label: "DG surcharge", amount: "250 USD" },
    { label: "Special handling fee", amount: "120 USD" },
    { label: "DG Documentation", amount: "80 USD" },
    { label: "Inspection fee", amount: "100 USD" },
    { label: "Emergency handling fee", amount: "70 USD" }
  ],
  "Door-to-Door quốc tế": [
    { label: "Phí local charge", amount: "95 USD" },
    { label: "Phí delivery order", amount: "28 USD" }
  ]
};
const contractStatusCreateOptions: SelectOption[] = [
  { label: "Nháp", value: "draft" },
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã chấp thuận", value: "accepted" },
  { label: "Đang hiệu lực", value: "active" },
  { label: "Sắp hết hạn", value: "expiring_soon" },
  { label: "Hết hiệu lực", value: "expired" },
  { label: "Đã chấm dứt", value: "terminated" }
];
const contractFareCodeOptions: SelectOption[] = [
  { label: "OCEAN-FRT", value: "OCEAN-FRT" },
  { label: "AIR-FRT", value: "AIR-FRT" },
  { label: "TRUCK-FRT", value: "TRUCK-FRT" },
  { label: "WHS-FEE", value: "WHS-FEE" }
];
const contractFareNameOptions: SelectOption[] = [
  { label: "OF Shanghai - Haiphong", value: "OF Shanghai - Haiphong" },
  { label: "OF Shenzhen - Haiphong", value: "OF Shenzhen - Haiphong" },
  { label: "OF Ningbo - Haiphong", value: "OF Ningbo - Haiphong" },
  { label: "OF Shanghai - Ho Chi Minh", value: "OF Shanghai - Ho Chi Minh" },
  { label: "OF Busan - Haiphong", value: "OF Busan - Haiphong" },
  { label: "OF Singapore - Ho Chi Minh", value: "OF Singapore - Ho Chi Minh" },
  { label: "OF Bangkok - Ho Chi Minh", value: "OF Bangkok - Ho Chi Minh" },
  { label: "OF Hong Kong - Haiphong", value: "OF Hong Kong - Haiphong" }
];
const contractDomesticFareCodeOptions: SelectOption[] = [
  { label: "CUSTOM-HQ", value: "CUSTOM-HQ" },
  { label: "TRUCK-DEL", value: "TRUCK-DEL" },
  { label: "WARE-OUT", value: "WARE-OUT" }
];
const contractDomesticFareNameOptions: SelectOption[] = [
  { label: "Custom Clearance", value: "Custom Clearance" },
  { label: "Trucking Fee", value: "Trucking Fee" },
  { label: "Warehouse Handling", value: "Warehouse Handling" }
];
const contractCarrierOptions: SelectOption[] = [
  { label: "Maersk", value: "Maersk" },
  { label: "CMA CGM", value: "CMA CGM" },
  { label: "Emirates SkyCargo", value: "Emirates SkyCargo" },
  { label: "Vietnam Airlines Cargo", value: "Vietnam Airlines Cargo" }
];
const contractModOptions: SelectOption[] = [
  { label: "FCL", value: "FCL" },
  { label: "LCL", value: "LCL" },
  { label: "Air Freight", value: "Air Freight" },
  { label: "Express", value: "Express" },
  { label: "Rail", value: "Rail" },
  { label: "Road (Cross-border)", value: "Road (Cross-border)" }
];
const contractContainerOptions: SelectOption[] = [
  { label: "20GP", value: "20GP" },
  { label: "40GP", value: "40GP" },
  { label: "40HC", value: "40HC" },
  { label: "45HC", value: "45HC" }
];
const contractCurrencyOptions: SelectOption[] = [
  { label: "USD", value: "USD" },
  { label: "VND", value: "VND" },
  { label: "EUR", value: "EUR" }
];
const contractUnitOptions: SelectOption[] = [
  { label: "/container", value: "/container" },
  { label: "/CBM", value: "/CBM" },
  { label: "/KG", value: "/KG" },
  { label: "/chuyến", value: "/chuyến" },
  { label: "/pallet", value: "/pallet" }
];
const contractDomesticPointOptions: SelectOption[] = [
  { label: "Kho Bình Dương", value: "Kho Bình Dương" },
  { label: "ICD Sóng Thần", value: "ICD Sóng Thần" },
  { label: "Cảng Cát Lái", value: "Cảng Cát Lái" },
  { label: "KCN VSIP 1", value: "KCN VSIP 1" }
];
const contractDomesticWarehouseOptions: SelectOption[] = [
  { label: "Kho Bình Dương", value: "Kho Bình Dương" },
  { label: "Kho Tân Tạo", value: "Kho Tân Tạo" },
  { label: "Kho Hải Phòng", value: "Kho Hải Phòng" }
];
const contractDocumentTypeOptions: SelectOption[] = [
  { label: "Contract", value: "Contract" },
  { label: "Amendment", value: "Amendment" },
  { label: "Rate Sheet", value: "Rate Sheet" },
  { label: "Appendix", value: "Appendix" }
];
const createQuoteOptions = ["SQ-2026-0005", "SQ-2026-0012", "SQ-2026-0018", "SQ-2026-0024"];
const bookingStatuses: BookingStatus[] = ["draft", "pending", "confirmed", "canceled"];
const bookingStatusMeta: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Nháp",
    className: "bg-[#E5E7EB] text-black"
  },
  pending: {
    label: "Chờ xác nhận",
    className: "bg-[#F5BF13] text-[#1F1F1F]"
  },
  confirmed: {
    label: "Đã xác nhận",
    className: "bg-[#0879C9] text-white"
  },
  canceled: {
    label: "Đã hủy",
    className: "bg-[#F33233] text-white"
  }
};
const customsServicePackages = [
  { id: "export-customs", name: "Khai báo hải quan xuất khẩu", price: "USD 80" },
  { id: "import-customs", name: "Khai báo hải quan nhập khẩu", price: "USD 95" }
] as const;
const valueProtectPackages = [
  { id: "standard-protect", name: "Gói tiêu chuẩn", description: "Bảo vệ cơ bản cho lô hàng thông thường", price: "0.3% giá trị hàng hóa" },
  { id: "extended-protect", name: "Gói mở rộng", description: "Mở rộng phạm vi bảo vệ cho các rủi ro vận hành", price: "0.5% giá trị hàng hóa" }
] as const;
const destinationCountryCodes: Record<string, string> = {
  "Bangkok": "th",
  "Busan": "kr",
  "Colombo": "lk",
  "Dubai": "ae",
  "Hamburg": "de",
  "Hong Kong": "hk",
  "Houston": "us",
  "Incheon": "kr",
  "Jakarta": "id",
  "Kaohsiung": "tw",
  "Los Angeles": "us",
  "Manila": "ph",
  "Osaka": "jp",
  "Rotterdam": "nl",
  "Shanghai": "cn",
  "Singapore": "sg",
  "Sydney": "au",
  "Tokyo": "jp",
  "Yokohama": "jp"
};

function getStatusFromCode(code: string): BookingStatus {
  if (code === "BR-2026-4001" || code === "BR-2026-4026") {
    return "pending";
  }

  if (code === "BR-2026-4016" || code === "BR-2026-4021") {
    return "canceled";
  }

  const numericPart = Number(code.replace(/\D/g, "")) || 0;
  const clusterSeed = Math.floor(numericPart / 2) % 12;

  if (clusterSeed <= 3) return "draft";
  if (clusterSeed <= 5) return "confirmed";
  if (clusterSeed <= 7) return "draft";
  if (clusterSeed === 8) return "pending";
  if (clusterSeed <= 10) return "confirmed";
  return "canceled";
}

function parseDisplayDate(date: string) {
  const [day, month, year] = date.split("/").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1).getTime();
}

function stripServiceDisplayLabel(service: string) {
  return service.replace(/^[^\p{L}\p{N}]+\s*/u, "");
}

function arraysEqual<T>(left: T[], right: T[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function formatDateTimeDisplay(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1).getTime();
}

function formatIsoDateToDisplay(date: string) {
  if (!date) {
    return "";
  }

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function getCurrentYearDateRange() {
  const year = new Date().getFullYear();

  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`
  };
}

const portFilterLabels: Record<string, string> = {
  "TP.HCM": "VNSGN - Cảng Cát Lái, TP.HCM",
  "Hồ Chí Minh": "VNSGN - Cảng Cát Lái, TP.HCM",
  "Hà Nội": "VNHAN - ICD Mỹ Đình, Hà Nội",
  "Hải Phòng": "VNHPH - Cảng Hải Phòng, Hải Phòng",
  "Đà Nẵng": "VNDAD - Cảng Tiên Sa, Đà Nẵng",
  "Cần Thơ": "VNCTO - Cảng Cần Thơ, Cần Thơ",
  "Quy Nhơn": "VNUIH - Cảng Quy Nhơn, Bình Định",
  "Vũng Tàu": "VNVUT - Cảng Cái Mép, Bà Rịa - Vũng Tàu",
  "Nha Trang": "VNNHA - Cảng Nha Trang, Khánh Hòa",
  "Cà Mau": "VNCAH - Cảng Năm Căn, Cà Mau",
  "Biên Hòa": "VNBIH - ICD Biên Hòa, Đồng Nai",
  "Đà Lạt": "VNDLI - ICD Đà Lạt, Lâm Đồng",
  "Bangkok": "THBKK - Cảng Bangkok, Thái Lan",
  "Busan": "KRPUS - Cảng Busan, Hàn Quốc",
  "Colombo": "LKCMB - Cảng Colombo, Sri Lanka",
  "Dubai": "AEJEA - Cảng Jebel Ali, Dubai",
  "Hamburg": "DEHAM - Cảng Hamburg, Đức",
  "Hong Kong": "HKHKG - Cảng Hong Kong, Hong Kong",
  "Houston": "USHOU - Cảng Houston, Hoa Kỳ",
  "Incheon": "KRINC - Cảng Incheon, Hàn Quốc",
  "Jakarta": "IDJKT - Cảng Tanjung Priok, Jakarta",
  "Kaohsiung": "TWKHH - Cảng Kaohsiung, Đài Loan",
  "Los Angeles": "USLAX - Cảng Los Angeles, Hoa Kỳ",
  "Manila": "PHMNL - Cảng Manila, Philippines",
  "Osaka": "JPOSA - Cảng Osaka, Nhật Bản",
  "Rotterdam": "NLRTM - Cảng Rotterdam, Hà Lan",
  "Shanghai": "CNSHA - Cảng Shanghai, Trung Quốc",
  "Singapore": "SGSIN - Cảng Singapore, Singapore",
  "Sydney": "AUSYD - Cảng Sydney, Úc",
  "Tokyo": "JPTYO - Cảng Tokyo, Nhật Bản",
  "Yokohama": "JPYOK - Cảng Yokohama, Nhật Bản"
};


const advancedFilterConfigs: Omit<AdvancedFilterConfig, "options">[] = [
  {
    key: "customers",
    label: "Khách hàng",
    placeholder: "Chọn khách hàng",
    searchPlaceholder: "Tìm theo tên khách hàng"
  },
  {
    key: "originPorts",
    label: "Cảng đi",
    placeholder: "Chọn cảng đi",
    searchPlaceholder: "Tìm theo cảng đi"
  },
  {
    key: "destinationPorts",
    label: "Cảng đến",
    placeholder: "Chọn cảng đến",
    searchPlaceholder: "Tìm theo cảng đến"
  },
  {
    key: "cargoTypes",
    label: "Loại hàng",
    placeholder: "Chọn loại hàng",
    searchPlaceholder: "Tìm loại hàng"
  },
  {
    key: "packaging",
    label: "Đóng gói dự kiến",
    placeholder: "Chọn hình thức đóng gói",
    searchPlaceholder: "Tìm hình thức đóng gói"
  }
];

const initialAdvancedFilterState: AdvancedFilterState = {
  customers: [],
  originPorts: [],
  destinationPorts: [],
  cargoTypes: [],
  packaging: []
};

const shipmentDetailPolOptions = [
  { value: "HPH — Hai Phong", label: "HPH — Hai Phong", flag: "🇻🇳", meta: "Hai Phong · Vietnam" },
  { value: "SGN — Ho Chi Minh", label: "SGN — Ho Chi Minh", flag: "🇻🇳", meta: "Ho Chi Minh · Vietnam" },
  { value: "DAD — Da Nang", label: "DAD — Da Nang", flag: "🇻🇳", meta: "Da Nang · Vietnam" },
  { value: "CNSHA — Shanghai", label: "CNSHA — Shanghai", flag: "🇨🇳", meta: "Shanghai · China" },
  { value: "SGSIN — Singapore", label: "SGSIN — Singapore", flag: "🇸🇬", meta: "Singapore · Singapore" }
] satisfies Array<SelectOption & { flag: string; meta: string }>;

const shipmentDetailPodOptions = [
  { value: "LCB — Laem Chabang", label: "LCB — Laem Chabang", flag: "🇹🇭", meta: "Laem Chabang · Thailand" },
  { value: "BKK — Bangkok", label: "BKK — Bangkok", flag: "🇹🇭", meta: "Bangkok · Thailand" },
  { value: "PHMNL — Manila", label: "PHMNL — Manila", flag: "🇵🇭", meta: "Manila · Philippines" },
  { value: "HKHKG — Hong Kong", label: "HKHKG — Hong Kong", flag: "🇭🇰", meta: "Hong Kong · Hong Kong" },
  { value: "JPTYO — Tokyo", label: "JPTYO — Tokyo", flag: "🇯🇵", meta: "Tokyo · Japan" }
] satisfies Array<SelectOption & { flag: string; meta: string }>;
const initialCustomerListFilterState: CustomerListFilterState = {
  contacts: [],
  companies: [],
  services: [],
  groups: [],
  expiryDates: []
};
const customerAccountStatusMeta: Record<
  CustomerAccountStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Nháp",
    className: "bg-[#E5E7EB] text-black"
  },
  active: {
    label: "Đang hoạt động",
    className: "bg-[#0879C9] text-white"
  },
  locked: {
    label: "Khóa",
    className: "bg-[#F33233] text-white"
  }
};
const statusFilterOptions = bookingStatuses.map((status) => ({
  value: status,
  label: bookingStatusMeta[status].label
}));
const statusFilterAllOption = { value: "all" as const, label: "Tất cả" };
const customerStatusFilterOptions = (Object.entries(customerAccountStatusMeta) as [
  CustomerAccountStatus,
  { label: string; className: string }
][]).map(([value, meta]) => ({
  value,
  label: meta.label
}));
const customerStatusFilterAllOption = { value: "all" as const, label: "Tất cả" };
function sortSelectOptions(options: SelectOption[]) {
  return [...options].sort((left, right) =>
    left.label.localeCompare(right.label, "vi", { sensitivity: "base" })
  );
}

function formatBookingCode(code: string) {
  return code.replaceAll("-", "\u2011");
}

function formatShipmentCodeFromBooking(code: string) {
  return code.replace(/^BR-/, "SHP-").replaceAll("-", "\u2011");
}

function formatPortFilterLabel(port: string) {
  return portFilterLabels[port] ?? port;
}

function formatPortScheduleValue(port: string) {
  const formatted = formatPortFilterLabel(port);
  const [code, ...rest] = formatted.split(" - ");
  if (rest.length === 0) {
    return formatted;
  }

  return `${rest.join(" - ")} (${code})`;
}

function openNativeDatePicker(event: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) {
  const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
  input.showPicker?.();
}

const draftRowsBase: BookingRow[] = [
  {
    code: "BR-2026-0001",
    customer: "Công ty TNHH Thương Mại Dịch Vụ Vận Tải Biển Đông",
    route: { from: "TP.HCM", to: "Los Angeles" },
    cargoType: "Dry",
    packaging: "Đóng pallet",
    status: "draft",
    createdAt: "11/03/2026"
  },
  {
    code: "BR-2026-0002",
    customer: "CTCP Minh Long",
    route: { from: "Hà Nội", to: "Singapore" },
    cargoType: "Reefer",
    packaging: "Đóng thùng",
    status: "pending",
    createdAt: "10/03/2026"
  },
  {
    code: "BR-2026-0003",
    customer: "Công ty CP Xuất Nhập Khẩu Nông Sản Việt Thành",
    route: { from: "Hồ Chí Minh", to: "Tokyo" },
    cargoType: "Dangerous",
    packaging: "Phuy thép",
    status: "confirmed",
    createdAt: "09/03/2026"
  },
  {
    code: "BR-2026-0004",
    customer: "Saigon Fresh",
    route: { from: "Đà Nẵng", to: "Busan" },
    cargoType: "General",
    packaging: "Thùng carton",
    status: "canceled",
    createdAt: "11/03/2026"
  },
  {
    code: "BR-2026-0005",
    customer: "Hưng Thịnh Foods",
    route: { from: "Cần Thơ", to: "Rotterdam" },
    cargoType: "Reefer",
    packaging: "Container lạnh",
    status: "draft",
    createdAt: "11/03/2026"
  },
  {
    code: "BR-2026-0006",
    customer: "Vina Chem",
    route: { from: "Hải Phòng", to: "Osaka" },
    cargoType: "Dangerous",
    packaging: "IBC tank",
    status: "pending",
    createdAt: "10/03/2026"
  },
  {
    code: "BR-2026-0007",
    customer: "Nam Bắc Logistics",
    route: { from: "Hà Nội", to: "Bangkok" },
    cargoType: "Dry",
    packaging: "Bao jumbo",
    status: "confirmed",
    createdAt: "10/03/2026"
  },
  {
    code: "BR-2026-0008",
    customer: "Green Export",
    route: { from: "Quy Nhơn", to: "Manila" },
    cargoType: "General",
    packaging: "Pallet gỗ",
    status: "canceled",
    createdAt: "09/03/2026"
  },
  {
    code: "BR-2026-0009",
    customer: "Oceanic Co.",
    route: { from: "TP.HCM", to: "Hamburg" },
    cargoType: "Oversized",
    packaging: "Kiện máy",
    status: "draft",
    createdAt: "09/03/2026"
  },
  {
    code: "BR-2026-0011",
    customer: "BlueWave Shipping",
    route: { from: "Vũng Tàu", to: "Kaohsiung" },
    cargoType: "Dry",
    packaging: "Bao PP",
    status: "pending",
    createdAt: "08/03/2026"
  },
  {
    code: "BR-2026-0012",
    customer: "Delta Export",
    route: { from: "Vũng Tàu", to: "Kaohsiung" },
    cargoType: "General",
    packaging: "Thùng carton",
    status: "confirmed",
    createdAt: "07/03/2026"
  },
  {
    code: "BR-2026-0013",
    customer: "Sunrise Foods",
    route: { from: "Vũng Tàu", to: "Kaohsiung" },
    cargoType: "Reefer",
    packaging: "Container lạnh",
    status: "canceled",
    createdAt: "07/03/2026"
  },
  {
    code: "BR-2026-0014",
    customer: "TransAsia Co.",
    route: { from: "TP.HCM", to: "Hamburg" },
    cargoType: "Dangerous",
    packaging: "Phuy nhựa",
    status: "draft",
    createdAt: "06/03/2026"
  },
  {
    code: "BR-2026-0015",
    customer: "Pacific Link",
    route: { from: "TP.HCM", to: "Hamburg" },
    cargoType: "Oversized",
    packaging: "Kiện gỗ",
    status: "pending",
    createdAt: "06/03/2026"
  },
  {
    code: "BR-2026-0016",
    customer: "Atlas Freight",
    route: { from: "Hải Phòng", to: "Jakarta" },
    cargoType: "General",
    packaging: "Thùng carton",
    status: "confirmed",
    createdAt: "05/03/2026"
  },
  {
    code: "BR-2026-0017",
    customer: "Mekong Produce",
    route: { from: "Cần Thơ", to: "Shanghai" },
    cargoType: "Reefer",
    packaging: "Container lạnh",
    status: "canceled",
    createdAt: "05/03/2026"
  },
  {
    code: "BR-2026-0018",
    customer: "EastGate Trading",
    route: { from: "Đà Nẵng", to: "Hong Kong" },
    cargoType: "Dry",
    packaging: "Bao PP",
    status: "draft",
    createdAt: "05/03/2026"
  },
  {
    code: "BR-2026-0019",
    customer: "Golden River Co.",
    route: { from: "TP.HCM", to: "Dubai" },
    cargoType: "Oversized",
    packaging: "Kiện máy",
    status: "pending",
    createdAt: "04/03/2026"
  },
  {
    code: "BR-2026-0020",
    customer: "Viet Spice Export",
    route: { from: "Quy Nhơn", to: "Colombo" },
    cargoType: "General",
    packaging: "Pallet gỗ",
    status: "confirmed",
    createdAt: "04/03/2026"
  },
  {
    code: "BR-2026-0021",
    customer: "NorthStar Logistics",
    route: { from: "Hà Nội", to: "Incheon" },
    cargoType: "Dry",
    packaging: "Bao jumbo",
    status: "canceled",
    createdAt: "04/03/2026"
  },
  {
    code: "BR-2026-0022",
    customer: "Blue Ocean Foods",
    route: { from: "Nha Trang", to: "Yokohama" },
    cargoType: "Reefer",
    packaging: "Container lạnh",
    status: "draft",
    createdAt: "03/03/2026"
  },
  {
    code: "BR-2026-0023",
    customer: "PetroTrans VN",
    route: { from: "Vũng Tàu", to: "Houston" },
    cargoType: "Dangerous",
    packaging: "IBC tank",
    status: "pending",
    createdAt: "03/03/2026"
  },
  {
    code: "BR-2026-0024",
    customer: "Asia Link",
    route: { from: "TP.HCM", to: "Sydney" },
    cargoType: "General",
    packaging: "Thùng carton",
    status: "confirmed",
    createdAt: "03/03/2026"
  },
  {
    code: "BR-2026-0025",
    customer: "EverBright Co.",
    route: { from: "Hải Phòng", to: "Manila" },
    cargoType: "Dry",
    packaging: "Đóng pallet",
    status: "canceled",
    createdAt: "02/03/2026"
  },
  {
    code: "BR-2026-0026",
    customer: "Sao Mai Seafood",
    route: { from: "Cà Mau", to: "Busan" },
    cargoType: "Reefer",
    packaging: "Container lạnh",
    status: "draft",
    createdAt: "02/03/2026"
  },
  {
    code: "BR-2026-0027",
    customer: "Pacific Resin",
    route: { from: "Biên Hòa", to: "Hamburg" },
    cargoType: "Dangerous",
    packaging: "Phuy nhựa",
    status: "pending",
    createdAt: "02/03/2026"
  },
  {
    code: "BR-2026-0028",
    customer: "Lotus Apparel",
    route: { from: "Hà Nội", to: "Los Angeles" },
    cargoType: "General",
    packaging: "Thùng carton",
    status: "confirmed",
    createdAt: "01/03/2026"
  },
  {
    code: "BR-2026-0029",
    customer: "Delta Marine",
    route: { from: "Hải Phòng", to: "Singapore" },
    cargoType: "Oversized",
    packaging: "Kiện gỗ",
    status: "canceled",
    createdAt: "01/03/2026"
  },
  {
    code: "BR-2026-0030",
    customer: "Fresh Harvest",
    route: { from: "Đà Lạt", to: "Tokyo" },
    cargoType: "Reefer",
    packaging: "Thùng xốp",
    status: "draft",
    createdAt: "01/03/2026"
  },
  {
    code: "BR-2026-0031",
    customer: "Nam Phuong Export",
    route: { from: "TP.HCM", to: "Rotterdam" },
    cargoType: "Dry",
    packaging: "Bao jumbo",
    status: "pending",
    createdAt: "28/02/2026"
  },
  {
    code: "BR-2026-0032",
    customer: "Tan Cang Supply",
    route: { from: "Vũng Tàu", to: "Kaohsiung" },
    cargoType: "General",
    packaging: "Pallet gỗ",
    status: "confirmed",
    createdAt: "28/02/2026"
  },
  {
    code: "BR-2026-0033",
    customer: "Global Chem",
    route: { from: "Hải Phòng", to: "Osaka" },
    cargoType: "Dangerous",
    packaging: "IBC tank",
    status: "canceled",
    createdAt: "28/02/2026"
  },
  {
    code: "BR-2026-0034",
    customer: "Sunline Cargo",
    route: { from: "TP.HCM", to: "Bangkok" },
    cargoType: "Dry",
    packaging: "Đóng pallet",
    status: "draft",
    createdAt: "27/02/2026"
  },
  {
    code: "BR-2026-0035",
    customer: "Emerald Food JSC",
    route: { from: "Cần Thơ", to: "Shanghai" },
    cargoType: "Reefer",
    packaging: "Container lạnh",
    status: "pending",
    createdAt: "27/02/2026"
  }
].map((row) => ({ ...row, status: getStatusFromCode(row.code) }));

function withBookingCode(code: string, nextSequence: number) {
  return code.replace(/\d{4}$/, String(nextSequence).padStart(4, "0"));
}

const generatedDraftRows: BookingRow[] = Array.from({ length: 100 }, (_, index) => {
  const template = draftRowsBase[index % draftRowsBase.length];
  const destinationOptions = Object.keys(destinationCountryCodes);
  const currentDestinationIndex = destinationOptions.indexOf(template.route.to);
  const nextDestination =
    destinationOptions[(currentDestinationIndex + index + 3) % destinationOptions.length] ?? template.route.to;

  return {
    ...template,
    code: withBookingCode(template.code, 4001 + index),
    route: {
      ...template.route,
      to: nextDestination === template.route.to
        ? destinationOptions[(currentDestinationIndex + index + 4) % destinationOptions.length] ?? template.route.to
        : nextDestination
    },
    status: getStatusFromCode(withBookingCode(template.code, 4001 + index)),
    createdAt: ["16/03/2026", "15/03/2026", "14/03/2026", "13/03/2026", "12/03/2026"][index % 5]
  };
});

const draftRows: BookingRow[] = [...draftRowsBase, ...generatedDraftRows];

function generateRowsForTab(baseRows: BookingRow[], sequenceStart: number, datePool: string[]) {
  return Array.from({ length: 100 }, (_, index) => {
    const template = baseRows[index % baseRows.length];
    const destinationOptions = Object.keys(destinationCountryCodes);
    const currentDestinationIndex = destinationOptions.indexOf(template.route.to);
    const nextDestination =
      destinationOptions[(currentDestinationIndex + index + 5) % destinationOptions.length] ?? template.route.to;

    return {
      ...template,
      code: withBookingCode(template.code, sequenceStart + index),
      route: {
        ...template.route,
        to:
          nextDestination === template.route.to
            ? destinationOptions[(currentDestinationIndex + index + 6) % destinationOptions.length] ??
              template.route.to
            : nextDestination
      },
      status: getStatusFromCode(withBookingCode(template.code, sequenceStart + index)),
      createdAt: datePool[index % datePool.length]
    };
  });
}

const pendingRowsBase: BookingRow[] = draftRowsBase.slice(0, 14).map((row, index) => ({
  ...row,
  code: withBookingCode(row.code, 1001 + index),
  createdAt: ["12/03/2026", "12/03/2026", "11/03/2026", "11/03/2026", "10/03/2026"][index % 5]
}));

const confirmedRowsBase: BookingRow[] = draftRowsBase.slice(14, 28).map((row, index) => ({
  ...row,
  code: withBookingCode(row.code, 2001 + index),
  createdAt: ["08/03/2026", "08/03/2026", "07/03/2026", "06/03/2026", "05/03/2026"][index % 5]
}));

const pendingRows: BookingRow[] = [
  ...pendingRowsBase,
  ...generateRowsForTab(pendingRowsBase, 5001, ["16/03/2026", "15/03/2026", "14/03/2026", "13/03/2026", "12/03/2026"])
];

const confirmedRows: BookingRow[] = [
  ...confirmedRowsBase,
  ...generateRowsForTab(confirmedRowsBase, 6001, ["11/03/2026", "10/03/2026", "09/03/2026", "08/03/2026", "07/03/2026"])
];

const rowsByTab: Record<string, BookingRow[]> = {
  "Nháp": draftRows,
  "Đang chờ xác nhận": pendingRows,
  "Đã xác nhận": confirmedRows
};

function SidebarLogo({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" className="flex items-center" onClick={onClick}>
      <Image
        src="/pi-logo.png"
        alt="PI Logistics"
        width={166}
        height={60}
        className="h-12 w-auto object-contain"
        priority
      />
    </button>
  );
}

function SidebarItemIcon({ icon }: { icon: SidebarIconName }) {
  const common = "h-4 w-4";
  if (icon === "description") {
    return <FileText className={common} strokeWidth={1.8} />;
  }

  if (icon === "folder") {
    return <Folder className={common} strokeWidth={1.8} />;
  }

  if (icon === "settings") {
    return <Settings2 className={common} strokeWidth={1.8} />;
  }

  return <History className={common} strokeWidth={1.8} />;
}

function BookingCodeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M7 2.5h6.78L19 7.72V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Z"
        fill="#F33233"
      />
      <path d="M14 2.5v4.8c0 .552.448 1 1 1H19" fill="#F9B5B5" />
      <path d="M8.5 10.5H15.5M8.5 14.5H15.5M8.5 18.5H13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SidebarGroupIcon({
  icon,
  className
}: {
  icon: SidebarGroup["icon"];
  className?: string;
}) {
  const common = `h-5 w-5 shrink-0 ${className ?? ""}`.trim();

  if (icon === "export") {
    return <Upload className={common} strokeWidth={1.8} />;
  }

  if (icon === "import") {
    return <Download className={common} strokeWidth={1.8} />;
  }

  if (icon === "pricing") {
    return <Calculator className={common} strokeWidth={1.8} />;
  }

  if (icon === "operations") {
    return <Truck className={common} strokeWidth={1.8} />;
  }

  if (icon === "customers") {
    return <UsersRound className={common} strokeWidth={1.8} />;
  }

  if (icon === "services") {
    return <Wrench className={common} strokeWidth={1.8} />;
  }

  if (icon === "documents") {
    return <FileText className={common} strokeWidth={1.8} />;
  }

  if (icon === "shipment") {
    return <ShipWheel className={common} strokeWidth={1.8} />;
  }

  return <Settings2 className={common} strokeWidth={1.8} />;
}

function RouteCell({
  from,
  to,
  className = "text-sm"
}: BookingRow["route"] & { className?: string }) {
  return (
    <div className={`flex w-full flex-wrap items-center justify-start gap-1.5 text-left text-foreground ${className}`}>
      <span>{from}</span>
      <span className="text-muted-foreground">→</span>
      <span>{to}</span>
    </div>
  );
}

function HeaderIconButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-hover-card flex h-8 w-8 items-center justify-center rounded-full border border-[#D7D7D7] bg-white text-foreground transition hover:bg-[#fafafa]"
    >
      {children}
    </button>
  );
}

function DesignDownArrowIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 16" className={className} aria-hidden="true">
      <path
        d="M27.62147 2.546l-12.073 12.828c-0.39695 0.4228-0.95106 0.66263-1.531 0.66263-0.57994 0-1.13406-0.23983-1.531-0.66263l-12.073-12.828c-0.907-0.964-0.224-2.546 1.1-2.546l25.008 0c1.324 0 2.007 1.582 1.1 2.546"
        fill="currentColor"
      />
    </svg>
  );
}

function BookingStatusTag({ status }: { status: BookingStatus }) {
  const meta = bookingStatusMeta[status];

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-[6px] px-1.5 py-1 text-xs font-semibold uppercase leading-none ${meta.className}`}
      title={meta.label}
    >
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

function CustomerAccountStatusTag({ status }: { status: CustomerAccountStatus }) {
  const meta = customerAccountStatusMeta[status];

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-[6px] px-1.5 py-1 text-xs font-semibold uppercase leading-none ${meta.className}`}
      title={meta.label}
    >
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

const contractStatusMeta: Record<ContractRow["status"], { label: string; className: string }> = {
  draft: {
    label: "Nháp",
    className: "bg-[#E5E7EB] text-black"
  },
  pending: {
    label: "Chờ duyệt",
    className: "bg-[#FEF3C7] text-[#92400E]"
  },
  accepted: {
    label: "Đã duyệt",
    className: "bg-[#DBEAFE] text-[#1D4ED8]"
  },
  active: {
    label: "Đang hiệu lực",
    className: "bg-[#0879C9] text-white"
  },
  expiring_soon: {
    label: "Sắp hết hạn",
    className: "bg-[#F59E0B] text-white"
  },
  expired: {
    label: "Hết hạn",
    className: "bg-[#F33233] text-white"
  },
  terminated: {
    label: "Hủy hợp đồng",
    className: "bg-[#6B7280] text-white"
  }
};
const contractStatusFilterOptions = (Object.entries(contractStatusMeta) as [
  ContractRow["status"],
  { label: string; className: string }
][]).map(([value, meta]) => ({
  value,
  label: meta.label
}));
const contractStatusFilterAllOption = { value: "all" as const, label: "Tất cả" };

function ContractStatusTag({ status }: { status: ContractRow["status"] }) {
  const meta = contractStatusMeta[status];

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-[6px] px-1.5 py-1 text-xs font-semibold uppercase leading-none ${meta.className}`}
      title={meta.label}
    >
      <span className="truncate">{meta.label}</span>
    </span>
  );
}

function getContractExpiryTextClass(row: ContractRow) {
  if (row.status === "draft") {
    return "text-foreground";
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const expiryTimestamp = parseDisplayDate(row.term.split(" - ")[1] ?? row.term);
  const daysUntilExpiry = Math.ceil((expiryTimestamp - startOfToday) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 30) {
    return "text-[#F33233]";
  }

  if (daysUntilExpiry < 60) {
    return "text-[#C58A00]";
  }

  return "text-foreground";
}

function formatContractServiceLabels(services: string[]) {
  const labels: string[] = [];

  if (services.some((service) => ["Ocean FCL", "Ocean LCL", "Air Freight"].includes(service))) {
    labels.push("Vận tải quốc tế");
  }

  if (services.includes("Trucking")) {
    labels.push("Vận tải nội địa");
  }

  if (services.includes("Custom Clearance")) {
    labels.push("Thủ tục hải quan");
  }

  if (services.includes("Warehouse")) {
    labels.push("Kho bãi & phân phối");
  }

  return labels.length > 0 ? labels.join(", ") : "-";
}

function CustomerServiceTag({
  service
}: {
  service: CustomerService;
}) {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-3 py-2 text-[13px] font-medium leading-none text-foreground">
      <span>{service}</span>
    </span>
  );
}

function BookingStatusProgress({
  status,
  includeCanceled = true
}: {
  status: BookingStatus;
  includeCanceled?: boolean;
}) {
  const steps = [
    { value: "draft", label: "Nháp" },
    { value: "pending", label: "Chờ xác nhận" },
    { value: "confirmed", label: "Đã xác nhận" },
    { value: "canceled", label: "Đã hủy" }
  ] as const satisfies { value: BookingStatus; label: string }[];
  const visibleSteps = steps.filter((step) => includeCanceled || step.value !== "canceled");
  const activeIndex = visibleSteps.findIndex((step) => step.value === status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visibleSteps.map((step, index) => {
        const isActive = index === activeIndex;
        const isCompleted = activeIndex > index && status !== "canceled";
        const isCanceled = step.value === "canceled" && status === "canceled";

        return (
          <div key={step.value} className="flex items-center gap-2">
            <div
              className={`inline-flex h-8 items-center rounded-full border-[0.5px] px-3 text-sm font-medium transition-colors ${
                isCanceled
                  ? "border-[#F33233] bg-[#FDECEC] text-[#B42318]"
                  : isActive
                    ? "border-[#245698] bg-white text-[#245698]"
                    : isCompleted
                      ? "border-[#22579B] bg-[#EAF1FB] text-[#22579B]"
                      : "border-border bg-card text-muted-foreground"
              }`}
            >
              {step.label}
            </div>
            {index < visibleSteps.length - 1 ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function DetailHeadingIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#F33233] text-white">
      {children}
    </span>
  );
}

function FilledActionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-white">
      {children}
    </span>
  );
}

function ActionChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.262 2.965c.386-.386 1.03-.48 1.519-.185l2.03 1.223c.527.317.73.969.478 1.53l-.696 1.546a1.1 1.1 0 0 0 .214 1.224l2.89 2.89c.334.334.83.42 1.224.214l1.545-.696c.562-.253 1.214-.05 1.531.478l1.223 2.03c.295.49.201 1.133-.185 1.52l-1.163 1.162c-.664.665-1.652.898-2.565.606-2.208-.707-4.706-2.445-6.7-4.439-1.994-1.994-3.732-4.491-4.439-6.7-.292-.912-.059-1.9.606-2.565l1.163-1.163Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ActionConfirmIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm3.664 4.811a.9.9 0 0 1 0 1.273l-4.177 4.177a.9.9 0 0 1-1.273 0L6.06 10.607a.9.9 0 1 1 1.273-1.273l1.518 1.518 3.54-3.54a.9.9 0 0 1 1.273 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SectionCard({
  title,
  description,
  children,
  className = "",
  headingIcon,
  headingAction
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headingIcon?: React.ReactNode;
  headingAction?: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl border border-border bg-card p-5 ${className}`.trim()}>
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {headingIcon}
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
          </div>
          {headingAction}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
  options,
  type = "text",
  multiline = false,
  readOnly = false,
  error,
  placeholder,
  variant = "default",
  allowWrapWhenReadOnly = false,
  autoSelectFirstOption = true,
  matchDropdownWidth = false,
  labelWidthClass = "grid-cols-[144px_minmax(0,1fr)]"
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  type?: "text" | "number" | "date";
  multiline?: boolean;
  readOnly?: boolean;
  error?: string;
  placeholder?: string;
  variant?: "default" | "inlineUnderline";
  allowWrapWhenReadOnly?: boolean;
  autoSelectFirstOption?: boolean;
  matchDropdownWidth?: boolean;
  labelWidthClass?: string;
}) {
  const isInlineUnderline = variant === "inlineUnderline";
  const [isCustomSelectOpen, setIsCustomSelectOpen] = useState(false);
  const customSelectRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const baseClassName =
    `min-h-[46px] w-full rounded-2xl border bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground ${
      error
        ? readOnly
          ? "border-[#F33233]"
          : "border-[#F33233] focus:border-[#F33233] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
        : readOnly
          ? "border-input"
          : "border-input focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
    }`;
  const inlineBaseClassName = `min-h-[36px] w-full border-0 border-b-0 bg-transparent px-0 text-[15px] text-foreground outline-none transition placeholder:text-[#C0C5D2] focus:border-0 focus:border-b-0 ${
    readOnly ? "cursor-default" : ""
  }`;
  const inputPlaceholder =
    placeholder ??
    (type === "date"
      ? "Chọn ngày"
      : type === "number"
        ? "Nhập số liệu"
        : `Nhập ${label.toLowerCase()}`);
  const visibleDropdownOptions = options?.filter((option) => option.value !== "") ?? [];
  const openDatePicker = () => {
    if (type !== "date" || readOnly) {
      return;
    }

    try {
      dateInputRef.current?.focus();
      dateInputRef.current?.showPicker?.();
    } catch {
      // Some browsers restrict showPicker to direct user gestures only.
      dateInputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!isCustomSelectOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customSelectRef.current?.contains(event.target as Node)) {
        setIsCustomSelectOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomSelectOpen]);

  useEffect(() => {
    if (!options || readOnly || value || !autoSelectFirstOption) {
      return;
    }

    const firstSelectableOption = options.find((option) => option.value !== "") ?? options[0];
    if (firstSelectableOption) {
      onChange?.(firstSelectableOption.value);
    }
  }, [autoSelectFirstOption, onChange, options, readOnly, value]);

  const renderControl = () =>
    multiline ? (
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        placeholder={inputPlaceholder}
        className={
          isInlineUnderline
            ? `${inlineBaseClassName} min-h-[72px] resize-none py-2 leading-6`
            : `${baseClassName} resize-none py-3 leading-6`
        }
        rows={isInlineUnderline ? 2 : 3}
      />
    ) : options ? (
      <div ref={customSelectRef} className="group relative">
        <button
          type="button"
          onClick={() => {
            if (!readOnly) {
              setIsCustomSelectOpen(true);
            }
          }}
          onFocus={() => {
            if (!readOnly) {
              setIsCustomSelectOpen(true);
            }
          }}
          className={
            isInlineUnderline
              ? `${inlineBaseClassName} flex items-center justify-between gap-3 text-left`
              : `${baseClassName} flex items-center justify-between gap-3 text-left`
          }
        >
          <span
            className={
              value
                ? "text-foreground"
                : isInlineUnderline
                  ? "text-[#C0C5D2]"
                  : "text-muted-foreground"
            }
          >
            {options.find((option) => option.value === value)?.label ?? inputPlaceholder}
          </span>
          <ChevronDown
            className={`shrink-0 text-muted-foreground transition-opacity ${
              isCustomSelectOpen ? "opacity-100" : readOnly ? "opacity-0" : "opacity-0 group-focus-within:opacity-100"
            } ${isInlineUnderline ? "h-4 w-4" : "h-4 w-4"}`}
            strokeWidth={1.8}
          />
        </button>
        {isCustomSelectOpen ? (
          <div
            className={`absolute left-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-[14px] border border-[#DADCE3] bg-[#f7f7f7] shadow-[0_12px_24px_rgba(17,17,17,0.12)] ${
              matchDropdownWidth ? "w-full min-w-full" : "min-w-[220px] w-[50%]"
            }`}
          >
            {visibleDropdownOptions.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.(option.value);
                    setIsCustomSelectOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[14px] transition-colors hover:bg-[#B6E1FF] ${
                    index === 0 ? "" : "border-t border-[#E7E6E9]"
                  }`}
                >
                  <span className={isSelected ? "font-semibold text-[#2054a3]" : "text-foreground"}>
                    {option.label}
                  </span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#2054a3]" strokeWidth={2} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        <ChevronDown
          className="hidden"
          strokeWidth={1.8}
        />
      </div>
    ) : readOnly && isInlineUnderline && allowWrapWhenReadOnly ? (
      <div className="min-h-[36px] w-full bg-transparent py-1 text-[15px] leading-5 text-foreground whitespace-normal break-words">
        {value || inputPlaceholder}
      </div>
    ) : type === "date" ? (
      <div className="relative">
        <button
          type="button"
          onClick={openDatePicker}
          className={`${isInlineUnderline ? inlineBaseClassName : baseClassName} flex items-center text-left`}
        >
          <span className={value ? "text-foreground" : isInlineUnderline ? "text-[#C0C5D2]" : "text-muted-foreground"}>
            {value || inputPlaceholder}
          </span>
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="pointer-events-none absolute inset-0 opacity-0"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    ) : (
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        placeholder={inputPlaceholder}
        className={isInlineUnderline ? inlineBaseClassName : baseClassName}
      />
    );

  if (isInlineUnderline) {
    return (
      <div className="space-y-2">
        <div className={`grid items-center gap-4 px-0 py-0 ${labelWidthClass}`}>
          <div className="whitespace-nowrap py-2 pr-4 text-[15px] font-semibold text-foreground">
            {label}
          </div>
          <div className={`min-w-0 border-b border-transparent transition-colors ${readOnly ? "" : "focus-within:border-black"}`}>
            {renderControl()}
          </div>
        </div>
        {error ? <p className="text-xs text-[#F33233]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {renderControl()}
      {error ? <p className="text-xs text-[#F33233]">{error}</p> : null}
    </div>
  );
}

function InlineFieldShell({
  label,
  error,
  children,
  readOnly = false,
  labelWidthClass = "grid-cols-[144px_minmax(0,1fr)]"
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  readOnly?: boolean;
  labelWidthClass?: string;
}) {
  return (
    <div className="space-y-2">
      <div className={`grid items-center gap-4 px-0 py-0 ${labelWidthClass}`}>
        <div className="whitespace-nowrap py-2 pr-4 text-[15px] font-semibold text-foreground">{label}</div>
        <div className={`min-w-0 border-b border-transparent transition-colors ${readOnly ? "" : "focus-within:border-black"}`}>
          {children}
        </div>
      </div>
      {error ? <p className="text-xs text-[#F33233]">{error}</p> : null}
    </div>
  );
}

function InlineDropdownField({
  label,
  values,
  options,
  onToggle,
  error,
  readOnly = false
}: {
  label: string;
  values: string[];
  options: readonly string[];
  onToggle: (value: string) => void;
  error?: string;
  readOnly?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const selectedLabel = values.length > 0 ? values.join(", ") : "Chọn";

  return (
    <InlineFieldShell label={label} error={error} readOnly={readOnly}>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            if (!readOnly) {
              setIsOpen((current) => !current);
            }
          }}
          className="flex min-h-[40px] w-full items-center justify-between gap-3 bg-transparent px-0 text-left text-[15px] text-foreground outline-none"
        >
          <span className={values.length > 0 ? "text-foreground" : "text-[#C0C5D2]"}>{selectedLabel}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-opacity ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
            strokeWidth={1.8}
          />
        </button>

        {isOpen && !readOnly ? (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-64 min-w-[220px] w-[50%] overflow-y-auto rounded-[14px] border border-[#DADCE3] bg-[#f7f7f7] shadow-[0_12px_24px_rgba(17,17,17,0.12)]">
            {options.map((option, index) => {
              const selected = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-[#B6E1FF] ${
                    index === 0 ? "" : "border-t border-[#E7E6E9]"
                  }`}
                >
                  <span className={selected ? "font-semibold text-[#2054a3]" : ""}>{option}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-[#2054a3]" strokeWidth={2} /> : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </InlineFieldShell>
  );
}

function TableDropdownField({
  value,
  options,
  onChange,
  placeholder = "Chọn",
  textSizeClass = "text-[15px]",
  heightClass = "h-7",
  disabled = false,
  dropdownWidthClass = "w-[50%]",
  searchable = false,
  searchPlaceholder = "Tìm kiếm",
  placeholderClassName = "text-[#9CA3AF]"
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  textSizeClass?: string;
  heightClass?: string;
  disabled?: boolean;
  dropdownWidthClass?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  placeholderClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const filteredOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        className={`flex ${heightClass} w-full items-center justify-between gap-2 border-0 px-0 text-left ${textSizeClass} text-foreground transition-colors ${
          disabled ? "cursor-default" : ""
        }`}
      >
        <span className={value ? "text-foreground" : placeholderClassName}>
          {options.find((option) => option.value === value)?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-opacity ${
            disabled ? "opacity-0" : isOpen ? "opacity-100" : "opacity-0"
          }`}
          strokeWidth={1.8}
        />
      </button>

      {isOpen && !disabled ? (
        <div className={`absolute left-0 top-full z-30 mt-1 max-h-64 min-w-[180px] overflow-y-auto rounded-[12px] border border-[#DADCE3] bg-[#f7f7f7] shadow-[0_12px_24px_rgba(17,17,17,0.12)] ${dropdownWidthClass}`}>
          {searchable ? (
            <div className="border-b border-[#E7E6E9] px-3 py-2">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-[8px] border border-[#DADCE3] bg-white px-3 text-[14px] text-foreground outline-none placeholder:text-[#9CA3AF] focus:border-[#245698]"
              />
            </div>
          ) : null}
          {filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[14px] transition-colors hover:bg-[#B6E1FF] ${
                  index === 0 ? "" : "border-t border-[#E7E6E9]"
                }`}
              >
                <span className={isSelected ? "font-semibold text-[#2054a3]" : "text-foreground"}>{option.label}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0 text-[#2054a3]" strokeWidth={2} /> : null}
              </button>
            );
          })}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-[14px] text-muted-foreground">Không có kết quả</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function InlineCompactField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-[145px_minmax(0,1fr)] items-center gap-5 px-0 py-0">
        <div className="whitespace-nowrap py-0.5 pr-4 text-[13px] font-semibold text-foreground">{label}</div>
        <div className="min-w-0 border-b border-transparent transition-colors focus-within:border-black">
          {children}
        </div>
      </div>
    </div>
  );
}

function InlineCompactDateField({
  value,
  onChange,
  placeholder = "Chọn ngày",
  textSizeClass = "text-[13px]",
  heightClass = "h-6",
  readOnly = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  textSizeClass?: string;
  heightClass?: string;
  readOnly?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    if (readOnly) {
      return;
    }

    try {
      inputRef.current?.focus();
      inputRef.current?.showPicker?.();
    } catch {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={openPicker}
        className={`flex ${heightClass} w-full items-center border-0 bg-transparent px-0 text-left ${textSizeClass} text-foreground outline-none ${
          readOnly ? "cursor-default" : ""
        }`}
      >
        <span className={value ? "text-foreground" : "text-[#9CA3AF]"}>
          {value ? formatIsoDateToDisplay(value) : placeholder}
        </span>
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>;
}

function resolveSelectOptionLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function getAvatarColorClass(name: string) {
  const palette = [
    "bg-[#5B8DEF]",
    "bg-[#6C63FF]",
    "bg-[#0F9D8A]",
    "bg-[#E67E22]",
    "bg-[#D35454]",
    "bg-[#7E57C2]",
    "bg-[#1F8A70]",
    "bg-[#3B82F6]"
  ] as const;
  const hash = Array.from(name).reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function TiptapRichTextEditor({
  value,
  onChange,
  placeholder,
  readOnly = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  readOnly?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "tiptap-content min-h-[160px] px-4 py-3 text-[14px] text-foreground outline-none"
      }
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentHtml = editor.getHTML();
    if (currentHtml !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#E7E6E9] bg-white">
      <div className="flex items-center gap-1 border-b border-[#E7E6E9] bg-[#FAFAFA] px-3 py-2">
        {[
          { label: "B", action: () => editor?.chain().focus().toggleBold().run(), isActive: editor?.isActive("bold") },
          { label: "I", action: () => editor?.chain().focus().toggleItalic().run(), isActive: editor?.isActive("italic") },
          { label: "H1", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: editor?.isActive("heading", { level: 1 }) },
          { label: "• List", action: () => editor?.chain().focus().toggleBulletList().run(), isActive: editor?.isActive("bulletList") },
          { label: "1. List", action: () => editor?.chain().focus().toggleOrderedList().run(), isActive: editor?.isActive("orderedList") },
          { label: "Quote", action: () => editor?.chain().focus().toggleBlockquote().run(), isActive: editor?.isActive("blockquote") },
          { label: "Undo", action: () => editor?.chain().focus().undo().run(), isActive: false, disabled: !editor?.can().chain().focus().undo().run() },
          { label: "Redo", action: () => editor?.chain().focus().redo().run(), isActive: false, disabled: !editor?.can().chain().focus().redo().run() }
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            disabled={readOnly || item.disabled}
            className={`inline-flex h-7 items-center rounded-[8px] px-2 text-[13px] font-medium transition ${
              item.isActive ? "bg-[#EAF1FF] text-[#2054a3]" : "text-foreground hover:bg-[#EEF3FF]"
            } ${readOnly || item.disabled ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="relative">
        {editor?.isEmpty ? (
          <div className="pointer-events-none absolute left-4 top-3 text-[14px] text-[#9CA3AF]">
            {placeholder}
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function AdvancedMultiSelectFilter({
  label,
  placeholder,
  searchPlaceholder,
  options,
  selectedValues,
  onChange,
  align = "left",
  searchable = true,
  immediateSingleChoice = false,
  openSignal = 0,
  onApplied,
  fullWidth = false,
  compactModal = false,
  modalWidthClass
}: {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  align?: "left" | "right";
  searchable?: boolean;
  immediateSingleChoice?: boolean;
  openSignal?: number;
  onApplied?: (values: string[]) => void;
  fullWidth?: boolean;
  compactModal?: boolean;
  modalWidthClass?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [draftSelectedValues, setDraftSelectedValues] = useState<string[]>(selectedValues);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousOpenSignalRef = useRef(openSignal);

  useEffect(() => {
    if (!isOpen) {
      setDraftSelectedValues(selectedValues);
    }
  }, [isOpen, selectedValues]);

  useEffect(() => {
    if (openSignal > previousOpenSignalRef.current) {
      setIsOpen(true);
    }
    previousOpenSignalRef.current = openSignal;
  }, [openSignal]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const normalizedSearchValue = searchValue.trim().toLowerCase();
  const filteredOptions = options.filter((option) =>
    searchable
      ? (option.searchText ?? option.label).toLowerCase().includes(normalizedSearchValue)
      : true
  );

  const toggleValue = (value: string) => {
    if (immediateSingleChoice) {
      const nextValues = selectedValues.includes(value) ? [] : [value];
      onChange(nextValues);
      setSearchValue("");
      setIsOpen(false);
      return;
    }

    if (draftSelectedValues.includes(value)) {
      setDraftSelectedValues(draftSelectedValues.filter((item) => item !== value));
      return;
    }

    setDraftSelectedValues([...draftSelectedValues, value]);
  };

  return (
    <div ref={containerRef} className={`relative max-w-full ${fullWidth ? "w-full" : "w-fit"}`}>
      <button
        type="button"
        className={`ui-hover-soft inline-flex h-[34px] max-w-full items-center justify-between gap-2 rounded-full border-[0.5px] bg-card px-3 text-left text-sm text-foreground transition-colors ${
          isOpen || selectedOptions.length > 0 ? "border-[#18181b]" : "border-[#cbccc9]"
        } ${fullWidth ? "w-full" : ""}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        <div className="min-w-0">
          {selectedOptions.length === 0 ? (
            <span className="block truncate">{label}</span>
          ) : (
            <span className="block truncate">
              {selectedOptions.length === 1 ? selectedOptions[0]?.label : `${label} (${selectedOptions.length})`}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          strokeWidth={1.8}
        />
      </button>

      {isOpen ? (
        <div
          className={`absolute top-full z-40 ${
            modalWidthClass ?? (immediateSingleChoice ? "w-[176px]" : compactModal ? "w-[254px]" : "w-[353px]")
          } max-w-[calc(100vw-32px)] rounded-[16px] bg-card shadow-[inset_0_0_0_0.5px_#E7E6E9,0_24px_62px_rgba(17,17,17,0.22)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {searchable ? (
            <>
              <div className="px-4 pt-1">
                <div className="rounded-xl bg-background/70 px-2">
                  <label className="flex h-10 items-center gap-2">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                    <input
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full border-0 bg-transparent p-0 text-sm text-foreground outline-none"
                    />
                  </label>
                </div>
              </div>
              <div className="border-b-[0.5px] border-[#18181b]" />
            </>
          ) : null}

          <div className={`scrollbar-hidden max-h-[280px] overflow-y-auto ${searchable ? "mt-2" : "py-2"}`}>
            {filteredOptions.map((option, index) => {
              const checked = immediateSingleChoice
                ? selectedValues.includes(option.value)
                : draftSelectedValues.includes(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => toggleValue(option.value)}
                  className={`flex w-full cursor-pointer items-start gap-3 px-4 py-2 text-left transition-colors hover:bg-sidebar ${
                    index === filteredOptions.length - 1 ? "" : "border-b-[0.5px] border-[#E7E6E9]"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="break-words text-sm leading-5 text-foreground">{option.label}</div>
                  </div>
                  {checked ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#22579B]" strokeWidth={2} /> : null}
                </button>
              );
            })}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Không tìm thấy kết quả phù hợp.
              </div>
            ) : null}
          </div>

          {!immediateSingleChoice ? (
            <div className="flex items-center justify-between border-t-[0.5px] border-[#18181b] px-4 py-4">
              <button
                type="button"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setDraftSelectedValues([])}
                disabled={draftSelectedValues.length === 0}
              >
                Xóa bộ lọc
              </button>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  className="text-sm font-medium text-[#22579B] transition-colors hover:text-[#1b467d]"
                  onClick={() => {
                    setDraftSelectedValues(selectedValues);
                    setSearchValue("");
                    setIsOpen(false);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-[#22579B] transition-colors hover:text-[#1b467d] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => {
                    onChange(draftSelectedValues);
                    onApplied?.(draftSelectedValues);
                    setSearchValue("");
                    setIsOpen(false);
                  }}
                  disabled={
                    draftSelectedValues.length === selectedValues.length &&
                    draftSelectedValues.every((value) => selectedValues.includes(value))
                  }
                >
                  Áp dụng
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function Page() {
  const currentUserName = "An Phạm";
  const desktopTableShellRef = useRef<HTMLDivElement | null>(null);
  const desktopTableBodyRef = useRef<HTMLDivElement | null>(null);
  const customerTableBodyRef = useRef<HTMLDivElement | null>(null);
  const contractTableBodyRef = useRef<HTMLDivElement | null>(null);
  const serviceConfigTableBodyRef = useRef<HTMLDivElement | null>(null);
  const detailsScrollRef = useRef<HTMLDivElement | null>(null);
  const detailsIntroCardRef = useRef<HTMLDivElement | null>(null);
  const bookingConfirmationInputRef = useRef<HTMLInputElement | null>(null);
  const contractScanInputRef = useRef<HTMLInputElement | null>(null);
  const contractCreateUploadInputRef = useRef<HTMLInputElement | null>(null);
  const contractDocumentUploadInputRef = useRef<HTMLInputElement | null>(null);
  const contractImportInputRef = useRef<HTMLInputElement | null>(null);
  const customerImportInputRef = useRef<HTMLInputElement | null>(null);
  const serviceDetailFeeInlineFormRef = useRef<HTMLDivElement | null>(null);
  const customsUploadInputRef = useRef<HTMLInputElement | null>(null);
  const inlandUploadInputRef = useRef<HTMLInputElement | null>(null);
  const overseaUploadInputRef = useRef<HTMLInputElement | null>(null);
  const customerAddressInlineFormRef = useRef<HTMLDivElement | null>(null);
  const customerContactInlineFormRef = useRef<HTMLDivElement | null>(null);
  const customerRouteInlineFormRef = useRef<HTMLDivElement | null>(null);
  const contractRateInlineFormRef = useRef<HTMLDivElement | null>(null);
  const contractDomesticInlineFormRef = useRef<HTMLDivElement | null>(null);
  const contractCustomsInlineFormRef = useRef<HTMLDivElement | null>(null);
  const contractWarehouseInlineFormRef = useRef<HTMLDivElement | null>(null);
  const contractOtherInlineFormRef = useRef<HTMLDivElement | null>(null);
  const contractDocumentInlineFormRef = useRef<HTMLDivElement | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);
  const customerStatusFilterRef = useRef<HTMLDivElement | null>(null);
  const contractStatusFilterRef = useRef<HTMLDivElement | null>(null);
  const contractExpiryFilterRef = useRef<HTMLDivElement | null>(null);
  const contractExpiryFromInputRef = useRef<HTMLInputElement | null>(null);
  const contractExpiryToInputRef = useRef<HTMLInputElement | null>(null);
  const rowActionMenuRef = useRef<HTMLDivElement | null>(null);
  const contractRowActionMenuRef = useRef<HTMLDivElement | null>(null);
  const detailsActionMenuRef = useRef<HTMLDivElement | null>(null);
  const customerTitleMenuRef = useRef<HTMLDivElement | null>(null);
  const customerBulkActionMenuRef = useRef<HTMLDivElement | null>(null);
  const globalSearchMenuRef = useRef<HTMLDivElement | null>(null);
  const customerSearchRef = useRef<HTMLDivElement | null>(null);
  const customerCreateContractRef = useRef<HTMLDivElement | null>(null);
  const originPortSearchRef = useRef<HTMLDivElement | null>(null);
  const destinationPortSearchRef = useRef<HTMLDivElement | null>(null);
  const [desktopRowsHeight, setDesktopRowsHeight] = useState<number | null>(null);
  const [desktopScrollbarWidth, setDesktopScrollbarWidth] = useState(0);
  const [customerTableScrollbarWidth, setCustomerTableScrollbarWidth] = useState(0);
  const [contractTableScrollbarWidth, setContractTableScrollbarWidth] = useState(0);
  const [serviceConfigTableScrollbarWidth, setServiceConfigTableScrollbarWidth] = useState(0);
  const [showStickyDetailsStatus, setShowStickyDetailsStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState<"bookings" | "customers">("bookings");
  const [customerSubPage, setCustomerSubPage] = useState<CustomerSubPage>("list");
  const [selectedBookingCode, setSelectedBookingCode] = useState<string | null>(null);
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [selectedContractCode, setSelectedContractCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilterState>(initialAdvancedFilterState);
  const [customerListFilters, setCustomerListFilters] = useState<CustomerListFilterState>(
    initialCustomerListFilterState
  );
  const [statusFilters, setStatusFilters] = useState<StatusFilterState>([]);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [customerStatusFilters, setCustomerStatusFilters] = useState<CustomerAccountStatus[]>([]);
  const [isCustomerStatusFilterOpen, setIsCustomerStatusFilterOpen] = useState(false);
  const [contractStatusFilters, setContractStatusFilters] = useState<ContractRow["status"][]>([]);
  const [isContractStatusFilterOpen, setIsContractStatusFilterOpen] = useState(false);
  const [contractExpiryRange, setContractExpiryRange] = useState({ from: "", to: "" });
  const [draftContractExpiryRange, setDraftContractExpiryRange] = useState(getCurrentYearDateRange());
  const [isContractExpiryFilterOpen, setIsContractExpiryFilterOpen] = useState(false);
  const [openRowActionCode, setOpenRowActionCode] = useState<string | null>(null);
  const [openContractRowActionCode, setOpenContractRowActionCode] = useState<string | null>(null);
  const [isDetailsActionMenuOpen, setIsDetailsActionMenuOpen] = useState(false);
  const [isCustomerTitleMenuOpen, setIsCustomerTitleMenuOpen] = useState(false);
  const [isCustomerBulkActionMenuOpen, setIsCustomerBulkActionMenuOpen] = useState(false);
  const [isGlobalSearchMenuOpen, setIsGlobalSearchMenuOpen] = useState(false);
  const [customerStatusOverrides, setCustomerStatusOverrides] = useState<Record<string, CustomerAccountStatus>>({});
  const [contractStatusOverrides, setContractStatusOverrides] = useState<Record<string, ContractRow["status"]>>({});
  const [deletedCustomerKeys, setDeletedCustomerKeys] = useState<string[]>([]);
  const [deletedContractCodes, setDeletedContractCodes] = useState<string[]>([]);
  const [selectedSearchFilters, setSelectedSearchFilters] = useState<Record<string, string[]>>({});
  const [selectedSearchGroupOptions, setSelectedSearchGroupOptions] = useState<string[]>([]);
  const [isCustomerImportModalOpen, setIsCustomerImportModalOpen] = useState(false);
  const [isContractImportModalOpen, setIsContractImportModalOpen] = useState(false);
  const [isCustomsDebitNoteOpen, setIsCustomsDebitNoteOpen] = useState(false);
  const [isCustomsDebitNotesListOpen, setIsCustomsDebitNotesListOpen] = useState(false);
  const [isCustomsDebitNotePreviewOpen, setIsCustomsDebitNotePreviewOpen] = useState(false);
  const [isCustomsPaymentRequestOpen, setIsCustomsPaymentRequestOpen] = useState(false);
  const [isInlandDebitNoteOpen, setIsInlandDebitNoteOpen] = useState(false);
  const [isInlandDebitNotesListOpen, setIsInlandDebitNotesListOpen] = useState(false);
  const [isInlandPaymentRequestOpen, setIsInlandPaymentRequestOpen] = useState(false);
  const [isCustomsDocumentFilesModalOpen, setIsCustomsDocumentFilesModalOpen] = useState(false);
  const [isCustomsDeclarationOpen, setIsCustomsDeclarationOpen] = useState(false);
  const [activeCustomsReplacingFileId, setActiveCustomsReplacingFileId] = useState<string | null>(null);
  const [customsDeclarationZoom, setCustomsDeclarationZoom] = useState<100 | 125 | 150>(150);
  const [customsDeclarationStatusByType, setCustomsDeclarationStatusByType] = useState<
    Record<CustomsTradeType, "draft" | "pending_confirmation" | "pending_payment">
  >({
    import: "draft",
    export: "draft"
  });
  const [customsDeclarationGoodsItems, setCustomsDeclarationGoodsItems] = useState<CustomsDeclarationGoodsItem[]>(
    createInitialCustomsDeclarationGoods()
  );
  const [activeCustomsDocumentFilesRowId, setActiveCustomsDocumentFilesRowId] = useState<string | null>(null);
  const [customsPaymentRequestDateText, setCustomsPaymentRequestDateText] = useState("Ngày 2 tháng 4 năm 2026");
  const [customsPaymentRequestFullName, setCustomsPaymentRequestFullName] = useState(currentUserName);
  const [customsPaymentRequestDepartment, setCustomsPaymentRequestDepartment] = useState("Customs");
  const [customsPaymentRequestStatusByType, setCustomsPaymentRequestStatusByType] = useState<
    Record<CustomsTradeType, CustomsDebitNoteStatus>
  >({
    import: "draft",
    export: "draft"
  });
  const [customsPaymentRequestDueDateByType, setCustomsPaymentRequestDueDateByType] = useState<Record<CustomsTradeType, string>>({
    import: "",
    export: ""
  });
  const [inlandPaymentRequestDateText, setInlandPaymentRequestDateText] = useState("Ngày 2 tháng 4 năm 2026");
  const [inlandPaymentRequestFullName, setInlandPaymentRequestFullName] = useState(currentUserName);
  const [inlandPaymentRequestDepartment, setInlandPaymentRequestDepartment] = useState("Inland");
  const [inlandPaymentRequestStatusByType, setInlandPaymentRequestStatusByType] = useState<
    Record<CustomsTradeType, CustomsDebitNoteStatus>
  >({
    import: "draft",
    export: "draft"
  });
  const [inlandPaymentRequestDueDateByType, setInlandPaymentRequestDueDateByType] = useState<Record<CustomsTradeType, string>>({
    import: "",
    export: ""
  });
  const [customsDebitNoteStatusByType, setCustomsDebitNoteStatusByType] = useState<
    Record<CustomsTradeType, CustomsDebitNoteStatus>
  >({
    import: "draft",
    export: "draft"
  });
  const [customsDebitNoteDueDateByType, setCustomsDebitNoteDueDateByType] = useState<Record<CustomsTradeType, string>>({
    import: "",
    export: ""
  });
  const [customsDebitNoteForcedRowIds, setCustomsDebitNoteForcedRowIds] = useState<Record<CustomsTradeType, string[]>>({
    import: [],
    export: []
  });
  const [selectedRowCodes, setSelectedRowCodes] = useState<string[]>([]);
  const [selectedCustomerRowKeys, setSelectedCustomerRowKeys] = useState<string[]>([]);
  const [destinationOpenSignal, setDestinationOpenSignal] = useState(0);
  const [openRoutePortMenu, setOpenRoutePortMenu] = useState<"origin" | "destination" | null>(null);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isCustomerCreateContractOpen, setIsCustomerCreateContractOpen] = useState(false);
  const [customerCreateContractSearch, setCustomerCreateContractSearch] = useState("");
  const [bookingListPageNumber, setBookingListPageNumber] = useState(1);
  const [customerListPageNumber, setCustomerListPageNumber] = useState(1);
  const [contractListPageNumber, setContractListPageNumber] = useState(1);
  const [serviceConfigListPageNumber, setServiceConfigListPageNumber] = useState(1);
  const [customerShipmentPage, setCustomerShipmentPage] = useState(1);
  const [selectedShipmentCode, setSelectedShipmentCode] = useState<string | null>(null);
  const [selectedServiceScope, setSelectedServiceScope] =
    useState<(typeof contractDisplayServiceOptions)[number]>(servicePageScopeOptions[0]);
  const [selectedServiceDetailKey, setSelectedServiceDetailKey] = useState<string | null>(null);
  const [shipmentWorkspaceTab, setShipmentWorkspaceTab] =
    useState<"list" | "details" | "customs" | "inland" | "oversea">("list");
  const [shipmentDetailDirection, setShipmentDetailDirection] = useState<"export" | "import">("export");
  const [shipmentDetailCargoType, setShipmentDetailCargoType] = useState<"FCL" | "LCL">("FCL");
  const [shipmentDetailEta, setShipmentDetailEta] = useState("");
  const [shipmentDetailEtd, setShipmentDetailEtd] = useState("");
  const [shipmentDetailAssignedStaff, setShipmentDetailAssignedStaff] = useState("");
  const [isShipmentDetailCustomerDropdownOpen, setIsShipmentDetailCustomerDropdownOpen] = useState(false);
  const [shipmentDetailCustomerName, setShipmentDetailCustomerName] = useState("YAMAHA MOTOR VIETNAM CO., LTD");
  const [shipmentDetailCustomerContact, setShipmentDetailCustomerContact] = useState("Ms. Tra");
  const [shipmentDetailCustomerAddress, setShipmentDetailCustomerAddress] = useState(
    "Lot 48-54 & Lot 59-68 Noibai Industrial Zone, Quang Tien Ward, Soc Son Dist, Hanoi, Vietnam"
  );
  const [shipmentDetailPol, setShipmentDetailPol] = useState("HPH — Hai Phong");
  const [shipmentDetailPolSub, setShipmentDetailPolSub] = useState("Hai Phong · Vietnam");
  const [shipmentDetailPod, setShipmentDetailPod] = useState("LCB — Laem Chabang");
  const [shipmentDetailPodSub, setShipmentDetailPodSub] = useState("Laem Chabang · Thailand");
  const [shipmentDetailCommodity, setShipmentDetailCommodity] = useState("YAMAHA MOTORCYCLE");
  const [shipmentDetailBookingNo, setShipmentDetailBookingNo] = useState("080600055654");
  const [shipmentDetailShipmentDate, setShipmentDetailShipmentDate] = useState("2026-04-01");
  const [shipmentDetailNumber, setShipmentDetailNumber] = useState("SHP-2025-0047");
  const [shipmentDetailCreatedAt, setShipmentDetailCreatedAt] = useState("2024-12-27");
  const [shipmentDetailCreatedBy, setShipmentDetailCreatedBy] = useState("Nguyen Van A — CS");
  const [shipmentDetailInternalNote, setShipmentDetailInternalNote] = useState("");
  const [shipmentDetailExternalNote, setShipmentDetailExternalNote] = useState("");
  const [shipmentDetailAttachments, setShipmentDetailAttachments] = useState<{ id: string; name: string; sizeLabel: string }[]>([]);
  const [customsTradeType, setCustomsTradeType] = useState<CustomsTradeType>("import");
  const [inlandTradeType, setInlandTradeType] = useState<CustomsTradeType>("import");
  const [customsCostRowsByType, setCustomsCostRowsByType] = useState<Record<CustomsTradeType, CustomsCostRow[]>>({
    import: createInitialCustomsCostRows("import"),
    export: createInitialCustomsCostRows("export")
  });
  const [customsCostDrafts, setCustomsCostDrafts] = useState<Record<string, string>>({});
  const shipmentDetailCustomerFieldRef = useRef<HTMLDivElement | null>(null);
  const [customsEditingCostRowId, setCustomsEditingCostRowId] = useState<string | null>(null);
  const [customsDocumentRowsByType, setCustomsDocumentRowsByType] = useState<
    Record<CustomsTradeType, CustomsDocumentRow[]>
  >({
    import: createInitialCustomsDocumentRows("import"),
    export: createInitialCustomsDocumentRows("export")
  });
  const [customsAuditRowsByType, setCustomsAuditRowsByType] = useState<Record<CustomsTradeType, CustomsAuditRow[]>>({
    import: createInitialCustomsAuditRows("import"),
    export: createInitialCustomsAuditRows("export")
  });
  const shipmentDetailAuditRows: ShipmentDetailAuditRow[] = [
    {
      id: "shipment-audit-1",
      action: "Tạo shipment",
      field: "Shipment ID",
      beforeValue: "-",
      afterValue: shipmentDetailNumber,
      actor: shipmentDetailCreatedBy,
      time: "27/12/2024 09:12"
    },
    {
      id: "shipment-audit-2",
      action: "Cập nhật khách hàng",
      field: "Tên Công ty Khách hàng",
      beforeValue: "Yamaha Motor",
      afterValue: shipmentDetailCustomerName,
      actor: currentUserName,
      time: "27/12/2024 10:24"
    },
    {
      id: "shipment-audit-3",
      action: "Cập nhật lô hàng",
      field: "POL → POD",
      beforeValue: "HPH — Hai Phong",
      afterValue: `${shipmentDetailPol} → ${shipmentDetailPod}`,
      actor: currentUserName,
      time: "27/12/2024 11:05"
    }
  ];
  const [isShipmentDetailAuditLogOpen, setIsShipmentDetailAuditLogOpen] = useState(false);
  const shipmentDetailAuditSectionRef = useRef<HTMLDivElement | null>(null);
  const [isCustomsAuditLogOpen, setIsCustomsAuditLogOpen] = useState(false);
  const customsAuditSectionRef = useRef<HTMLDivElement | null>(null);
  const [activeCustomsUploadRowId, setActiveCustomsUploadRowId] = useState<string | null>(null);
  const [inlandCostRowsByType, setInlandCostRowsByType] = useState<Record<CustomsTradeType, InlandCostRow[]>>({
    import: createInitialInlandCostRows("import"),
    export: createInitialInlandCostRows("export")
  });
  const [inlandDebitNoteStatusByType, setInlandDebitNoteStatusByType] = useState<Record<CustomsTradeType, CustomsDebitNoteStatus>>({
    import: "draft",
    export: "draft"
  });
  const [inlandDebitNoteDueDateByType, setInlandDebitNoteDueDateByType] = useState<Record<CustomsTradeType, string>>({
    import: "",
    export: ""
  });
  const [inlandDebitNoteForcedRowIds, setInlandDebitNoteForcedRowIds] = useState<Record<CustomsTradeType, string[]>>({
    import: [],
    export: []
  });
  const [inlandCostDrafts, setInlandCostDrafts] = useState<Record<string, string>>({});
  const [inlandEditingCostRowId, setInlandEditingCostRowId] = useState<string | null>(null);
  const [inlandDocumentRowsByType, setInlandDocumentRowsByType] = useState<
    Record<CustomsTradeType, InlandDocumentRow[]>
  >({
    import: createInitialInlandDocumentRows("import"),
    export: createInitialInlandDocumentRows("export")
  });
  const [inlandAuditRowsByType, setInlandAuditRowsByType] = useState<Record<CustomsTradeType, InlandAuditRow[]>>({
    import: createInitialInlandAuditRows("import"),
    export: createInitialInlandAuditRows("export")
  });
  const [isInlandAuditLogOpen, setIsInlandAuditLogOpen] = useState(false);
  const inlandAuditSectionRef = useRef<HTMLDivElement | null>(null);
  const [activeInlandUploadRowId, setActiveInlandUploadRowId] = useState<string | null>(null);
  const [overseaTradeType, setOverseaTradeType] = useState<CustomsTradeType>("import");
  const [overseaCostRowsByType, setOverseaCostRowsByType] = useState<Record<CustomsTradeType, OverseaCostRow[]>>({
    import: createInitialOverseaCostRows("import"),
    export: createInitialOverseaCostRows("export")
  });
  const [overseaCostDrafts, setOverseaCostDrafts] = useState<Record<string, string>>({});
  const [overseaEditingCostRowId, setOverseaEditingCostRowId] = useState<string | null>(null);
  const [overseaDocumentRowsByType, setOverseaDocumentRowsByType] = useState<
    Record<CustomsTradeType, OverseaDocumentRow[]>
  >({
    import: createInitialOverseaDocumentRows("import"),
    export: createInitialOverseaDocumentRows("export")
  });
  const [overseaAuditRowsByType, setOverseaAuditRowsByType] = useState<Record<CustomsTradeType, OverseaAuditRow[]>>({
    import: createInitialOverseaAuditRows("import"),
    export: createInitialOverseaAuditRows("export")
  });
  const [isOverseaAuditLogOpen, setIsOverseaAuditLogOpen] = useState(false);
  const overseaAuditSectionRef = useRef<HTMLDivElement | null>(null);
  const [activeOverseaUploadRowId, setActiveOverseaUploadRowId] = useState<string | null>(null);
  const [isOverseaUploadingRowId, setIsOverseaUploadingRowId] = useState<string | null>(null);
  const shipmentDetailUploadInputRef = useRef<HTMLInputElement | null>(null);
  const initialServiceDetailFeeForm: ServiceDetailFeeRowState = {
    feeType: "",
    unit: "",
    rate: "",
    required: false
  };
  const [contractScanFileName, setContractScanFileName] = useState("");
  const [contractCreateUploadFileName, setContractCreateUploadFileName] = useState("");
  const [customerImportFileName, setCustomerImportFileName] = useState("");
  const [contractImportFileName, setContractImportFileName] = useState("");
  const [contractScanFileUrl, setContractScanFileUrl] = useState("");
  const [contractScanUpdatedAt, setContractScanUpdatedAt] = useState("");
  const [customerCreateWorkspaceTab, setCustomerCreateWorkspaceTab] = useState<"address" | "contacts" | "routes" | "notes">("address");
  const [contractCreateWorkspaceTab, setContractCreateWorkspaceTab] =
    useState<"services" | "domestic" | "customs" | "warehouse" | "other" | "documents" | "notes">("documents");
  const [recentCustomerSearches, setRecentCustomerSearches] = useState<string[]>([]);
  const [recentOriginPortSearches, setRecentOriginPortSearches] = useState<string[]>([]);
  const [recentDestinationPortSearches, setRecentDestinationPortSearches] = useState<string[]>([]);
  const [openSidebarGroups, setOpenSidebarGroups] = useState<string[]>([]);
  const [serviceDetailFeeForm, setServiceDetailFeeForm] = useState<ServiceDetailFeeRowState>(initialServiceDetailFeeForm);
  const [serviceDetailFeeRows, setServiceDetailFeeRows] = useState<ServiceDetailFeeRowState[]>([]);
  const [isServiceDetailFeeFormOpen, setIsServiceDetailFeeFormOpen] = useState(false);
  const initialCustomerCreateForm: CustomerCreateFormState = {
    customerName: "",
    englishName: "",
    taxId: "",
    customerGroup: "",
    customerType: "",
    services: [],
    priority: "0",
    salesperson: currentUserName,
    source: "",
    responsibleCompanies: [],
    phone: "",
    email: "",
    website: "",
    tags: [],
    status: "draft",
    contractCode: ""
  };
  const initialContractCreateForm: ContractCreateFormState = {
    code: "PIL-CNT-2025-001",
    customer: "",
    contractCompany: "",
    contractType: "",
    signedAt: "",
    validFrom: "",
    validTo: "",
    status: "draft",
    services: [],
    serviceItems: {},
    notes: ""
  };
  const initialContractRateForm: ContractRateFormState = {
    fareCode: "OCEAN-FRT",
    fareName: "OF Shanghai - Haiphong",
    pol: "",
    pod: "",
    carrier: "",
    mod: "FCL",
    container: "20GP",
    rate: "",
    currency: "USD",
    unit: "/container",
    effectiveFrom: "",
    effectiveTo: ""
  };
  const initialContractDomesticForm: ContractDomesticServiceFormState = {
    fareCode: "CUSTOM-HQ",
    fareName: "Custom Clearance",
    pickupPoint: "",
    deliveryPoint: "",
    unit: "/container",
    container: "20GP",
    currency: "USD",
    rate: "",
    linkedWarehouse: ""
  };
  const initialContractCustomsForm: ContractCustomsFormState = {
    serviceName: "",
    unit: "/container",
    currency: "USD",
    rate: ""
  };
  const initialContractWarehouseForm: ContractWarehouseFormState = {
    serviceName: "",
    unit: "/container",
    currency: "USD",
    rate: ""
  };
  const initialContractOtherForm: ContractWarehouseFormState = {
    serviceName: "",
    unit: "/container",
    currency: "USD",
    rate: ""
  };
  const initialContractServiceFeeDraftForm: ContractServiceFeeDraftFormState = {
    feeName: "",
    currency: "",
    rate: ""
  };
  const initialContractDocumentForm: ContractDocumentFormState = {
    fileName: "",
    documentType: "",
    documentName: "",
    documentDate: "",
    uploadedBy: currentUserName
  };
  const initialCustomerAddressForm: CustomerAddressFormState = {
    line1: "",
    line2: "",
    country: "Việt Nam",
    city: "Hồ Chí Minh",
    postalCode: "",
    addressType: "Head Office"
  };
  const initialCustomerContactForm: CustomerContactFormState = {
    fullName: "",
    role: "Sales Contact",
    phone: "",
    email: "",
    department: "",
    isPrimary: false,
    notes: ""
  };
  const initialCustomerRouteForm: CustomerRouteFormState = {
    shippingDirection: "Export (Xuất)",
    transportMode: "FCL",
    incoterm: "",
    cargoGroup: "General Cargo",
    cargoDescription: "",
    hsCode: "",
    exportCountry: "",
    importCountry: "",
    pol: "",
    pod: "",
    containerType: "",
    estimatedVolume: "",
    estimatedWeight: "",
    otherRequirements: ""
  };
  const [customerCreateErrors, setCustomerCreateErrors] = useState<CustomerCreateFormErrors>({});
  const [contractCreateErrors, setContractCreateErrors] = useState<ContractCreateFormErrors>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [customerCreateForm, setCustomerCreateForm] = useState<CustomerCreateFormState>(initialCustomerCreateForm);
  const [customerAddressForm, setCustomerAddressForm] = useState<CustomerAddressFormState>(initialCustomerAddressForm);
  const [customerAddressRows, setCustomerAddressRows] = useState<CustomerAddressFormState[]>([]);
  const [isCustomerAddressFormOpen, setIsCustomerAddressFormOpen] = useState(false);
  const [customerContactForm, setCustomerContactForm] = useState<CustomerContactFormState>(initialCustomerContactForm);
  const [customerContactRows, setCustomerContactRows] = useState<CustomerContactFormState[]>([]);
  const [isCustomerContactFormOpen, setIsCustomerContactFormOpen] = useState(false);
  const [customerRouteForm, setCustomerRouteForm] = useState<CustomerRouteFormState>(initialCustomerRouteForm);
  const [customerRouteRows, setCustomerRouteRows] = useState<CustomerRouteFormState[]>([]);
  const [isCustomerRouteFormOpen, setIsCustomerRouteFormOpen] = useState(false);
  const [customerInternalNotes, setCustomerInternalNotes] = useState("");
  const [contractCreateForm, setContractCreateForm] = useState<ContractCreateFormState>(initialContractCreateForm);
  const [contractRateForm, setContractRateForm] = useState<ContractRateFormState>(initialContractRateForm);
  const [contractRateRows, setContractRateRows] = useState<ContractRateFormState[]>([]);
  const [isContractRateFormOpen, setIsContractRateFormOpen] = useState(false);
  const [contractDomesticForm, setContractDomesticForm] =
    useState<ContractDomesticServiceFormState>(initialContractDomesticForm);
  const [contractDomesticRows, setContractDomesticRows] = useState<ContractDomesticServiceFormState[]>([]);
  const [isContractDomesticFormOpen, setIsContractDomesticFormOpen] = useState(false);
  const [contractCustomsForm, setContractCustomsForm] =
    useState<ContractCustomsFormState>(initialContractCustomsForm);
  const [contractCustomsRows, setContractCustomsRows] = useState<ContractCustomsFormState[]>([]);
  const [isContractCustomsFormOpen, setIsContractCustomsFormOpen] = useState(false);
  const [contractWarehouseForm, setContractWarehouseForm] =
    useState<ContractWarehouseFormState>(initialContractWarehouseForm);
  const [contractWarehouseRows, setContractWarehouseRows] = useState<ContractWarehouseFormState[]>([]);
  const [isContractWarehouseFormOpen, setIsContractWarehouseFormOpen] = useState(false);
  const [contractOtherForm, setContractOtherForm] =
    useState<ContractWarehouseFormState>(initialContractOtherForm);
  const [contractOtherRows, setContractOtherRows] = useState<ContractWarehouseFormState[]>([]);
  const [isContractOtherFormOpen, setIsContractOtherFormOpen] = useState(false);
  const [contractInternationalFeeDrafts, setContractInternationalFeeDrafts] = useState<
    Record<string, ContractServiceFeeDraftFormState>
  >({});
  const [contractDocumentForm, setContractDocumentForm] =
    useState<ContractDocumentFormState>(initialContractDocumentForm);
  const [contractDocumentRows, setContractDocumentRows] = useState<ContractDocumentFormState[]>([]);
  const [isContractDocumentFormOpen, setIsContractDocumentFormOpen] = useState(false);
  const allBookingRows = Object.values(rowsByTab).flat();
  const isCustomerPage = currentPage === "customers";
  const isCustomerListPage = currentPage === "customers" && customerSubPage === "list" && !selectedCustomerKey;
  const isCustomerCreatePage = currentPage === "customers" && customerSubPage === "create";
  const isCustomerContractCreatePage = currentPage === "customers" && customerSubPage === "create-contract";
  const isCustomerContractsPage =
    currentPage === "customers" && customerSubPage === "contracts" && !selectedContractCode;
  const isCustomerServicesPage =
    currentPage === "customers" && customerSubPage === "services" && !selectedServiceDetailKey;
  const isCustomerShipmentPage = currentPage === "customers" && customerSubPage === "shipments";
  const isCustomerShipmentListPage = isCustomerShipmentPage && shipmentWorkspaceTab === "list";
  const isCustomerCustomsPage = isCustomerShipmentPage && shipmentWorkspaceTab === "customs";
  const isCustomerInlandPage = isCustomerShipmentPage && shipmentWorkspaceTab === "inland";
  const isCustomerOverseaPage = isCustomerShipmentPage && shipmentWorkspaceTab === "oversea";
  const isCustomerShipmentDetailsPage = isCustomerShipmentPage && shipmentWorkspaceTab === "details";
  const isServiceDetailsPage =
    currentPage === "customers" && customerSubPage === "services" && !!selectedServiceDetailKey;
  const isCustomerDetailsPage = currentPage === "customers" && customerSubPage === "list" && !!selectedCustomerKey;
  const isCustomerCreateLikePage = isCustomerCreatePage || isCustomerDetailsPage;
  const isContractDetailsPage = currentPage === "customers" && customerSubPage === "contracts" && !!selectedContractCode;
  const isBookingListPage = currentPage === "bookings" && !selectedBookingCode;
  const isCreatePage = selectedBookingCode === CREATE_BOOKING_CODE;
  const createBookingRow: BookingRow = {
    code: "BR-2026-9001",
    customer: "Công ty TNHH Thương Mại Dịch Vụ Vận Tải Biển Đông",
    route: {
      from: "TP.HCM",
      to: "Singapore"
    },
    cargoType: "Dry",
    packaging: "Đóng pallet",
    status: "draft",
    createdAt: "17/03/2026"
  };
  const selectedBookingRow = isCreatePage
    ? createBookingRow
    : selectedBookingCode
      ? allBookingRows.find((row) => row.code === selectedBookingCode) ?? null
      : null;
  const activeRows = rowsByTab[activeTab] ?? draftRows;
  const customerScopedRows =
    advancedFilters.customers.length > 0
      ? activeRows.filter((row) => advancedFilters.customers.includes(row.customer))
      : activeRows;
  const originScopedRows = customerScopedRows;
  const destinationScopedRows =
    advancedFilters.originPorts.length > 0
      ? customerScopedRows.filter((row) => advancedFilters.originPorts.includes(row.route.from))
      : customerScopedRows;
  const cargoTypeScopedRows =
    advancedFilters.destinationPorts.length > 0
      ? destinationScopedRows.filter((row) => advancedFilters.destinationPorts.includes(row.route.to))
      : destinationScopedRows;
  const packagingScopedRows =
    advancedFilters.cargoTypes.length > 0
      ? cargoTypeScopedRows.filter((row) => advancedFilters.cargoTypes.includes(row.cargoType))
      : cargoTypeScopedRows;
  const filterOptionsByKey: Record<AdvancedFilterConfig["key"], SelectOption[]> = {
    customers: sortSelectOptions(
      [...new Set(activeRows.map((row) => row.customer))].map((customer) => ({
        label: customer,
        value: customer
      }))
    ),
    originPorts: sortSelectOptions(
      [...new Set(originScopedRows.map((row) => row.route.from))].map((originPort) => ({
        label: formatPortFilterLabel(originPort),
        value: originPort
      }))
    ),
    destinationPorts: sortSelectOptions(
      [...new Set(destinationScopedRows.map((row) => row.route.to))].map((destinationPort) => ({
        label: formatPortFilterLabel(destinationPort),
        value: destinationPort
      }))
    ),
    cargoTypes: sortSelectOptions(
      [...new Set(cargoTypeScopedRows.map((row) => row.cargoType))].map((cargoType) => ({
        label: cargoType,
        value: cargoType
      }))
    ),
    packaging: sortSelectOptions(
      [...new Set(packagingScopedRows.map((row) => row.packaging))].map((packaging) => ({
        label: packaging,
        value: packaging
      }))
    )
  };
  const resolvedAdvancedFilterConfigs: AdvancedFilterConfig[] = advancedFilterConfigs.map((config) => ({
    ...config,
    options: filterOptionsByKey[config.key]
  }));
  const visibleRows = activeRows
    .filter((row) => {
      if (advancedFilters.customers.length > 0 && !advancedFilters.customers.includes(row.customer)) {
        return false;
      }

      if (advancedFilters.originPorts.length > 0 && !advancedFilters.originPorts.includes(row.route.from)) {
        return false;
      }

      if (
        advancedFilters.destinationPorts.length > 0 &&
        !advancedFilters.destinationPorts.includes(row.route.to)
      ) {
        return false;
      }

      if (advancedFilters.cargoTypes.length > 0 && !advancedFilters.cargoTypes.includes(row.cargoType)) {
        return false;
      }

      if (advancedFilters.packaging.length > 0 && !advancedFilters.packaging.includes(row.packaging)) {
        return false;
      }

      if (statusFilters.length > 0 && !statusFilters.includes(row.status)) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateDiff = parseDisplayDate(b.createdAt) - parseDisplayDate(a.createdAt);
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return a.code.localeCompare(b.code, "vi");
    });
  const extraCustomerPrefixes = [
    "Công ty TNHH",
    "Công ty Cổ phần",
    "Tập đoàn",
    "Công ty Liên doanh",
    "Tổng công ty"
  ] as const;
  const extraCustomerIndustries = [
    "Logistics",
    "Thương mại Quốc tế",
    "Xuất Nhập khẩu",
    "Chuỗi Cung Ứng",
    "Phân phối Hàng tiêu dùng",
    "Sản xuất Công nghiệp",
    "Nông sản Toàn cầu",
    "Thiết bị Y tế",
    "Bán lẻ Đa kênh",
    "Kho vận Miền Nam"
  ] as const;
  const extraCustomerSuffixes = [
    "Việt Nam",
    "Miền Bắc",
    "Miền Trung",
    "Miền Nam",
    "Đông Dương",
    "Toàn Cầu",
    "Asia Pacific",
    "Holdings",
    "Group",
    "Corporation"
  ] as const;
  const extraLongDescriptors = [
    "",
    "và Dịch vụ Hậu cần Tích hợp",
    "với Hệ sinh thái Kho vận và Phân phối Toàn quốc",
    "cho Chuỗi Bán lẻ, FMCG và Thương mại Điện tử",
    "Chuyên giải pháp Vận tải Đa phương thức",
    "Chuyên Quản lý Đơn hàng, Fulfillment và Last-mile",
    "và Giải pháp Xuất nhập khẩu cho Khách hàng Doanh nghiệp",
    "với Dịch vụ Vận chuyển Quốc tế và Đại lý Hải quan"
  ] as const;
  const extraCustomerNames = Array.from({ length: 210 }, (_, index) => {
    const prefix = extraCustomerPrefixes[index % extraCustomerPrefixes.length];
    const industry = extraCustomerIndustries[index % extraCustomerIndustries.length];
    const suffix = extraCustomerSuffixes[Math.floor(index / extraCustomerPrefixes.length) % extraCustomerSuffixes.length];
    const descriptor = index < 5 ? extraLongDescriptors[(index % (extraLongDescriptors.length - 1)) + 1] : "";
    const shortUniqueSuffix = index >= 100 ? ` C${String(index - 99).padStart(3, "0")}` : "";
    return `${prefix} ${industry} ${suffix}${shortUniqueSuffix} ${descriptor}`.replace(/\s+/g, " ").trim();
  });
  const customerSearchOptions = sortSelectOptions(
    [...new Set([...allBookingRows.map((row) => row.customer), ...extraCustomerNames])].map((customer) => ({
      label: customer,
      value: customer
    }))
  );
  const customerContactDirectory = Object.fromEntries(
    customerSearchOptions.map((option, index) => {
      const names = ["Trần Minh Tuấn", "Nguyễn Hoàng Anh", "Lê Thanh Phương", "Phạm Thu Hà", "Đỗ Quang Vinh"];
      const base = option.value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")
        .toLowerCase();
      return [
        option.value,
        {
          contactName: names[index % names.length],
          email: `${base.slice(0, 24) || "customer"}@pi-logistics.vn`,
          phone: `+84 28 3825 ${String(6700 + index).padStart(4, "0")}`
        }
      ];
    })
  ) as Record<string, { contactName: string; email: string; phone: string }>;
  const baseCustomerRows = customerSearchOptions.map((option, index) => {
    const totalBookings = allBookingRows.filter((row) => row.customer === option.value).length;
    const accountStatuses: CustomerAccountStatus[] = ["draft", "active", "active", "locked"];
    const customerTypes = ["Shipper", "Consignee", "Agent", "Co-loader", "Both (Shipper+Consignee)"] as const;
    const fakeTaxIds = [
      "4827165903",
      "7159042683",
      "2638491057",
      "9047153826",
      "5382609417",
      "1764950283",
      "8293504716",
      "6402819573",
      "3571948260",
      "9184620753",
      "2048573619",
      "7613094825"
    ] as const;
    const availableGroups = ["Corporate", "Individual", "Government", "SOE"] as const;
    const availableServices = [
      ["Ocean FCL", "Warehouse"],
      ["Air Freight"],
      ["Trucking"],
      ["Ocean LCL", "Trucking"],
      ["Warehouse"],
      ["Custom Clearance", "Air Freight"]
    ] as const;

    const companyCode = index % 2 === 0 ? "PIL" : "TDB";
    const companyAssignment = companyCode;
    const currentYear = new Date().getFullYear();

    return {
      customerCode: `${companyCode}-CUS-${currentYear}-${String(index + 1).padStart(4, "0")}`,
      customer: option.value,
      taxId: fakeTaxIds[index % fakeTaxIds.length],
      customerType: customerTypes[index % customerTypes.length],
      contractCompany: companyAssignment,
      contactName: customerContactDirectory[option.value]?.contactName ?? "",
      email: customerContactDirectory[option.value]?.email ?? "",
      phone: customerContactDirectory[option.value]?.phone ?? "",
      totalBookings,
      status: accountStatuses[index % accountStatuses.length],
      customerGroup: availableGroups[index % availableGroups.length],
      services: [...availableServices[index % availableServices.length]]
    };
  });
  const customerRows = baseCustomerRows
    .filter((row) => !deletedCustomerKeys.includes(row.customer))
    .map((row) => {
      const statusOverride = customerStatusOverrides[row.customer];
      return statusOverride ? { ...row, status: statusOverride } : row;
    });
  const shipmentDetailCustomerOptions = customerRows.map((row) => row.customer);
  const normalizedShipmentDetailCustomerQuery = shipmentDetailCustomerName.trim().toLowerCase();
  const filteredShipmentDetailCustomerOptions = shipmentDetailCustomerOptions.filter((customer) =>
    customer.toLowerCase().includes(normalizedShipmentDetailCustomerQuery)
  );
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!shipmentDetailCustomerFieldRef.current?.contains(event.target as Node)) {
        setIsShipmentDetailCustomerDropdownOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);
  const contractRows: ContractRow[] = customerRows.map((row, index) => {
    const seededContractStatuses: ContractRow["status"][] = [
      "draft",
      "pending",
      "accepted",
      "active",
      "expiring_soon",
      "expired",
      "terminated"
    ];
    const status = seededContractStatuses[index % seededContractStatuses.length];
    const nearExpiryTerms = [
      "01/01/2025 - 12/04/2026",
      "15/02/2025 - 08/05/2026",
      "01/03/2025 - 20/05/2026"
    ] as const;
    const longTerms = [
      "01/01/2025 - 31/12/2026",
      "15/01/2025 - 30/11/2026",
      "01/04/2025 - 31/03/2027"
    ] as const;
    const expiredTerms = [
      "01/01/2025 - 31/12/2025",
      "15/02/2025 - 28/02/2026",
      "01/03/2025 - 15/03/2026"
    ] as const;

    let term: string = longTerms[index % longTerms.length];
    if (status === "expired") {
      term = expiredTerms[index % expiredTerms.length];
    } else if (status === "expiring_soon") {
      term = nearExpiryTerms[index % nearExpiryTerms.length];
    }

    const code = `${(row.contractCompany.split(" / ")[0] ?? "PIL")}-CNT-2025-${String(index + 1).padStart(3, "0")}`;

    return {
      code,
      customer: row.customer,
      contractCompany: row.contractCompany,
      services: [...row.services],
      contractType:
        index % 3 === 0
          ? "Hợp đồng thương mại"
          : index % 3 === 1
            ? "Hợp đồng nguyên tắc"
            : "Hợp đồng kinh tế",
      term,
      status: contractStatusOverrides[code] ?? status,
      signedAt: `${String(10 + (index % 18)).padStart(2, "0")}/03/2025`
    };
  }).filter((row) => !deletedContractCodes.includes(row.code));
  const serviceConfigRows: ServiceConfigRow[] = (
    [
      {
        service: "Ocean FCL",
        description: "Dịch vụ vận tải biển và điều phối lô hàng quốc tế.",
        status: "active" as const
      },
      {
        service: "Air Freight",
        description: "Dịch vụ vận tải hàng không và xử lý giao nhận nhanh.",
        status: "active" as const
      },
      {
        service: "Warehouse",
        description: "Dịch vụ lưu kho, xử lý hàng và điều phối xuất nhập kho.",
        status: "draft" as const
      }
    ] satisfies Array<Pick<ServiceConfigRow, "service" | "description" | "status">>
  ).map((row) => ({
    ...row,
    customerCount: customerRows.filter((customer) => customer.services.includes(row.service)).length,
    contractCount: contractRows.filter((contract) => contract.services.includes(row.service)).length
  }));
  const serviceConfigNestedRows = contractDisplayServiceOptions.flatMap((service) => {
    const serviceLabelWithoutEmoji = service.replace(/^[^\p{L}\p{N}]+\s*/u, "");
    const meta =
      service === "🌍 Vận tải quốc tế"
        ? {
            customerCount: customerRows.filter((customer) =>
              customer.services.some((customerService) =>
                ["Ocean FCL", "Ocean LCL", "Air Freight"].includes(customerService)
              )
            ).length,
            contractCount: contractRows.filter((contract) =>
              contract.services.some((contractService) =>
                ["Ocean FCL", "Ocean LCL", "Air Freight"].includes(contractService)
              )
            ).length,
            status: "active" as ServiceConfigStatus
          }
        : service === "🚚 Vận tải nội địa"
          ? {
              customerCount: customerRows.filter((customer) => customer.services.includes("Trucking")).length,
              contractCount: contractRows.filter((contract) => contract.services.includes("Trucking")).length,
              status: "active" as ServiceConfigStatus
            }
          : service === "📑 Thủ tục hải quan"
            ? {
                customerCount: customerRows.filter((customer) => customer.services.includes("Custom Clearance")).length,
                contractCount: contractRows.filter((contract) => contract.services.includes("Custom Clearance")).length,
                status: "active" as ServiceConfigStatus
              }
            : {
                customerCount: customerRows.filter((customer) => customer.services.includes("Warehouse")).length,
                contractCount: contractRows.filter((contract) => contract.services.includes("Warehouse")).length,
                status: "draft" as ServiceConfigStatus
              };

    return contractDisplayServiceItemOptions[service].map((item, index) => ({
      service,
      serviceCode: serviceItemCodeMap[item] ?? item.slice(0, 3).toUpperCase(),
      serviceLabelWithoutEmoji,
      item,
      feeCount: 2 + ((index + serviceLabelWithoutEmoji.length) % 4),
      createdBy: serviceConfigCreators[(index + serviceLabelWithoutEmoji.length) % serviceConfigCreators.length],
      customerCount: meta.customerCount,
      contractCount: meta.contractCount,
      status: meta.status,
      isFirstInGroup: index === 0
    }));
  });
  const selectedServiceDetailRow = selectedServiceDetailKey
    ? serviceConfigNestedRows.find((row) => `${row.service}__${row.item}` === selectedServiceDetailKey) ?? null
    : null;
  const selectedServiceDetailScope = selectedServiceDetailRow?.service ?? null;
  const selectedServiceDetailRows = selectedServiceDetailScope
    ? serviceConfigNestedRows.filter((row) => row.service === selectedServiceDetailScope)
    : [];
  const selectedServiceDetailDisplayName = selectedServiceDetailScope
    ? stripServiceDisplayLabel(selectedServiceDetailScope)
    : "";
  const selectedServiceDetailStatus = selectedServiceDetailRow?.status ?? "active";
  const selectedServiceDetailMetrics = [
    {
      label: "Loại hình",
      value: selectedServiceDetailRows.length
    },
    {
      label: "Loại phí",
      value: selectedServiceDetailRows.reduce((total, row) => total + row.feeCount, 0)
    },
    {
      label: "Khách hàng",
      value: selectedServiceDetailRows[0]?.customerCount ?? 0
    },
    {
      label: "Hợp đồng",
      value: selectedServiceDetailRows[0]?.contractCount ?? 0
    }
  ].filter((item) => item.value > 0);
  const serviceDetailNavigationRows = selectedServiceDetailScope
    ? serviceConfigNestedRows.filter((row) => row.service === selectedServiceDetailScope)
    : [];
  const serviceDetailIndex = selectedServiceDetailKey
    ? serviceDetailNavigationRows.findIndex((row) => `${row.service}__${row.item}` === selectedServiceDetailKey)
    : -1;
  const previousServiceDetail =
    serviceDetailIndex > 0 ? serviceDetailNavigationRows[serviceDetailIndex - 1] : null;
  const nextServiceDetail =
    serviceDetailIndex >= 0 && serviceDetailIndex < serviceDetailNavigationRows.length - 1
      ? serviceDetailNavigationRows[serviceDetailIndex + 1]
      : null;
  const serviceDetailActivityRows = selectedServiceDetailScope
    ? [
        {
          actor: selectedServiceDetailRows[0]?.createdBy ?? "An Phạm",
          time: "Hôm nay lúc 10:15",
          message: `Cập nhật phạm vi ${selectedServiceDetailDisplayName} và đồng bộ ${selectedServiceDetailRows.length} loại hình dịch vụ.`
        },
        {
          actor: "Admin PI Logistics",
          time: "Hôm nay lúc 08:40",
          message: `Điều chỉnh tổng số lượng phí mặc định cho ${selectedServiceDetailDisplayName}.`
        },
        {
          actor: "System",
          time: "Hôm qua lúc 17:20",
          message: `Khởi tạo cấu hình chi tiết cho ${selectedServiceDetailDisplayName}.`
        }
      ]
    : [];
  const serviceDetailActivityGroups = [
    {
      label: "Hôm nay",
      entries: serviceDetailActivityRows.filter((entry) => entry.time.startsWith("Hôm nay"))
    },
    {
      label: "Hôm qua",
      entries: serviceDetailActivityRows.filter((entry) => entry.time.startsWith("Hôm qua"))
    }
  ].filter((group) => group.entries.length > 0);
  const hasServiceDetailFeeDraft =
    serviceDetailFeeForm.feeType.trim() !== "" ||
    serviceDetailFeeForm.unit.trim() !== "" ||
    serviceDetailFeeForm.rate.trim() !== "" ||
    serviceDetailFeeForm.required;
  const selectedCustomerRow = selectedCustomerKey
    ? customerRows.find((row) => row.customer === selectedCustomerKey) ?? null
    : null;
  const selectedResponsibleCompany = (customerCreateForm.responsibleCompanies[0] ??
    selectedCustomerRow?.contractCompany.split(" / ")[0] ??
    "") as (typeof customerResponsibleCompanyOptions)[number] | "";
  const selectedResponsibleCompanyInfo = selectedResponsibleCompany
    ? responsibleCompanyDirectory[selectedResponsibleCompany]
    : null;
  const isCustomerDetailEditable = selectedCustomerRow?.status === "draft";
  const canEditCustomerDetailTabs = !isCustomerDetailsPage || selectedCustomerRow?.status !== "locked";
  const matchedCustomerContracts = selectedCustomerRow
    ? contractRows.filter((row) => row.customer === selectedCustomerRow.customer)
    : [];
  const customerDetailPrimaryCompany = selectedCustomerRow?.contractCompany.split(" / ")[0] ?? "";
  const customerDetailSeededAddressRows: CustomerAddressFormState[] = selectedCustomerRow
    ? [
        {
          line1: "Tầng 5, 123 Nguyễn Huệ",
          line2: "Phường Bến Nghé, Quận 1",
          city: "Hồ Chí Minh",
          country: "Việt Nam",
          postalCode: "700000",
          addressType: "Head Office"
        }
      ]
    : [];
  const customerDetailSeededContactRows: CustomerContactFormState[] = selectedCustomerRow
    ? [
        {
          fullName: selectedCustomerRow.contactName || "Nguyễn Minh Châu",
          role: "Sales Contact",
          phone: selectedCustomerRow.phone,
          email: selectedCustomerRow.email,
          department: "Logistics",
          isPrimary: true,
          notes: ""
        }
      ]
    : [];
  const customerDetailSeededRouteRows: CustomerRouteFormState[] = selectedCustomerRow
    ? [
        {
          shippingDirection: "Export (Xuất)",
          transportMode: selectedCustomerRow.services[0]?.includes("Air")
            ? "Air"
            : selectedCustomerRow.services[0]?.includes("Truck")
              ? "Truck"
              : selectedCustomerRow.services[0]?.includes("Warehouse")
                ? "Multimodal"
                : "FCL",
          incoterm: "FOB",
          cargoGroup: "General Cargo",
          cargoDescription: "General merchandise",
          hsCode: "392690",
          exportCountry: "Việt Nam",
          importCountry: "Singapore",
          pol: "Cát Lái",
          pod: "Singapore",
          containerType: "20GP",
          estimatedVolume: "28",
          estimatedWeight: "12500",
          otherRequirements: ""
        }
      ]
    : [];
  const customerDetailInitialForm: CustomerCreateFormState | null = selectedCustomerRow
    ? {
        customerName: selectedCustomerRow.customer,
        englishName: buildEnglishCustomerName(selectedCustomerRow.customer),
        taxId: selectedCustomerRow.taxId,
        customerGroup: selectedCustomerRow.customerGroup,
        customerType: selectedCustomerRow.customerType,
        services: [...selectedCustomerRow.services],
        priority: selectedCustomerRow.status === "draft" ? "1" : selectedCustomerRow.status === "active" ? "2" : "0",
        salesperson: "An Phạm",
        source: "Referral",
        responsibleCompanies: selectedCustomerRow.contractCompany.split(" / "),
        phone: selectedCustomerRow.phone,
        email: selectedCustomerRow.email,
        website: buildCustomerDetailWebsite(selectedCustomerRow.customer),
        tags: [selectedCustomerRow.customerGroup],
        status: selectedCustomerRow.status,
        contractCode: matchedCustomerContracts[0]?.code ?? ""
      }
    : null;
  const customerDetailInitialNotes = selectedCustomerRow
    ? `Ghi chú nội bộ về ${selectedCustomerRow.customer}. Công ty phụ trách chính: ${customerDetailPrimaryCompany}.`
    : "";
  const selectedContractRow = selectedContractCode
    ? contractRows.find((row) => row.code === selectedContractCode) ?? null
    : null;
  const activeContractDetailStatus = isContractDetailsPage ? contractCreateForm.status : selectedContractRow?.status;
  const isContractDetailReadOnly =
    isContractDetailsPage &&
    (activeContractDetailStatus === "expired" || activeContractDetailStatus === "terminated");
  const customerAddressCityOptions =
    customerAddressProvinceOptions[customerAddressForm.country] ?? customerAddressProvinceOptions["Việt Nam"];
  const hasCustomerAddressDraft =
    customerAddressForm.line1.trim() !== "" ||
    customerAddressForm.line2.trim() !== "" ||
    customerAddressForm.country !== initialCustomerAddressForm.country ||
    customerAddressForm.city !== initialCustomerAddressForm.city ||
    customerAddressForm.postalCode.trim() !== "" ||
    customerAddressForm.addressType !== initialCustomerAddressForm.addressType;
  const hasCustomerContactDraft =
    customerContactForm.fullName.trim() !== "" ||
    customerContactForm.role !== initialCustomerContactForm.role ||
    customerContactForm.phone.trim() !== "" ||
    customerContactForm.email.trim() !== "" ||
    customerContactForm.department.trim() !== "" ||
    customerContactForm.isPrimary !== initialCustomerContactForm.isPrimary ||
    customerContactForm.notes.trim() !== "";
  const hasCustomerRouteDraft =
    customerRouteForm.shippingDirection !== initialCustomerRouteForm.shippingDirection ||
    customerRouteForm.transportMode !== initialCustomerRouteForm.transportMode ||
    customerRouteForm.incoterm !== "" ||
    customerRouteForm.cargoGroup !== initialCustomerRouteForm.cargoGroup ||
    customerRouteForm.cargoDescription.trim() !== "" ||
    customerRouteForm.hsCode.trim() !== "" ||
    customerRouteForm.exportCountry !== "" ||
    customerRouteForm.importCountry !== "" ||
    customerRouteForm.pol !== "" ||
    customerRouteForm.pod !== "" ||
    customerRouteForm.containerType !== "" ||
    customerRouteForm.estimatedVolume.trim() !== "" ||
    customerRouteForm.estimatedWeight.trim() !== "" ||
    customerRouteForm.otherRequirements.trim() !== "";
  const hasContractRateDraft =
    contractRateForm.fareCode !== initialContractRateForm.fareCode ||
    contractRateForm.fareName !== initialContractRateForm.fareName ||
    contractRateForm.pol !== "" ||
    contractRateForm.pod !== "" ||
    contractRateForm.carrier !== "" ||
    contractRateForm.mod !== initialContractRateForm.mod ||
    contractRateForm.container !== initialContractRateForm.container ||
    contractRateForm.rate.trim() !== "" ||
    contractRateForm.currency !== initialContractRateForm.currency ||
    contractRateForm.unit !== initialContractRateForm.unit ||
    contractRateForm.effectiveFrom !== "" ||
    contractRateForm.effectiveTo !== "";
  const hasContractDomesticDraft =
    contractDomesticForm.fareCode !== initialContractDomesticForm.fareCode ||
    contractDomesticForm.fareName !== initialContractDomesticForm.fareName ||
    contractDomesticForm.pickupPoint !== "" ||
    contractDomesticForm.deliveryPoint !== "" ||
    contractDomesticForm.unit !== initialContractDomesticForm.unit ||
    contractDomesticForm.container !== initialContractDomesticForm.container ||
    contractDomesticForm.currency !== initialContractDomesticForm.currency ||
    contractDomesticForm.rate.trim() !== "" ||
    contractDomesticForm.linkedWarehouse !== "";
  const hasContractCustomsDraft =
    contractCustomsForm.serviceName !== "" ||
    contractCustomsForm.unit !== initialContractCustomsForm.unit ||
    contractCustomsForm.currency !== initialContractCustomsForm.currency ||
    contractCustomsForm.rate.trim() !== "";
  const hasContractWarehouseDraft =
    contractWarehouseForm.serviceName !== "" ||
    contractWarehouseForm.unit !== initialContractWarehouseForm.unit ||
    contractWarehouseForm.currency !== initialContractWarehouseForm.currency ||
    contractWarehouseForm.rate.trim() !== "";
  const hasContractOtherDraft =
    contractOtherForm.serviceName.trim() !== "" ||
    contractOtherForm.unit !== initialContractOtherForm.unit ||
    contractOtherForm.currency !== initialContractOtherForm.currency ||
    contractOtherForm.rate.trim() !== "";
  const hasContractDocumentDraft =
    contractDocumentForm.fileName.trim() !== "" ||
    contractDocumentForm.documentType !== "" ||
    contractDocumentForm.documentName.trim() !== "" ||
    contractDocumentForm.documentDate !== "";
  const emptyCustomerAddressRows = Math.max(0, 5 - customerAddressRows.length);
  const emptyCustomerContactRows = Math.max(0, 5 - customerContactRows.length);
  const emptyContractRateRows = Math.max(0, 5 - contractRateRows.length);
  const emptyContractDomesticRows = Math.max(0, 5 - contractDomesticRows.length);
  const emptyContractCustomsRows = Math.max(0, 5 - contractCustomsRows.length);
  const emptyContractWarehouseRows = Math.max(0, 5 - contractWarehouseRows.length);
  const emptyContractOtherRows = Math.max(0, 5 - contractOtherRows.length);
  const emptyContractDocumentRows = Math.max(0, 5 - contractDocumentRows.length);
  const openNextCustomerAddressRow = () => {
    if (hasCustomerAddressDraft) {
      setCustomerAddressRows((current) => [...current, customerAddressForm]);
      setCustomerAddressForm(initialCustomerAddressForm);
      setIsCustomerAddressFormOpen(true);
      return;
    }

    setIsCustomerAddressFormOpen(true);
  };

  const openNextCustomerContactRow = () => {
    if (hasCustomerContactDraft) {
      setCustomerContactRows((current) => [...current, customerContactForm]);
      setCustomerContactForm(initialCustomerContactForm);
      setIsCustomerContactFormOpen(true);
      return;
    }

    setIsCustomerContactFormOpen(true);
  };

  const openNextCustomerRouteRow = () => {
    if (hasCustomerRouteDraft) {
      setCustomerRouteRows((current) => [...current, customerRouteForm]);
      setCustomerRouteForm(initialCustomerRouteForm);
      setIsCustomerRouteFormOpen(true);
      return;
    }

    setIsCustomerRouteFormOpen(true);
  };
  const openNextServiceDetailFeeRow = () => {
    if (hasServiceDetailFeeDraft) {
      setServiceDetailFeeRows((current) => [...current, serviceDetailFeeForm]);
      setServiceDetailFeeForm(initialServiceDetailFeeForm);
      setIsServiceDetailFeeFormOpen(true);
      return;
    }

    setIsServiceDetailFeeFormOpen(true);
  };
  const openNextContractRateRow = () => {
    if (isContractDetailReadOnly) {
      return;
    }

    if (hasContractRateDraft) {
      setContractRateRows((current) => [...current, contractRateForm]);
      setContractRateForm(initialContractRateForm);
      setIsContractRateFormOpen(true);
      return;
    }

    setIsContractRateFormOpen(true);
  };
  const openNextContractDomesticRow = () => {
    if (isContractDetailReadOnly) {
      return;
    }

    if (hasContractDomesticDraft) {
      setContractDomesticRows((current) => [...current, contractDomesticForm]);
      setContractDomesticForm(initialContractDomesticForm);
      setIsContractDomesticFormOpen(true);
      return;
    }

    setIsContractDomesticFormOpen(true);
  };
  const openNextContractCustomsRow = () => {
    if (isContractDetailReadOnly) {
      return;
    }

    if (hasContractCustomsDraft) {
      setContractCustomsRows((current) => [...current, contractCustomsForm]);
      setContractCustomsForm(initialContractCustomsForm);
      setIsContractCustomsFormOpen(true);
      return;
    }

    setIsContractCustomsFormOpen(true);
  };
  const openNextContractWarehouseRow = () => {
    if (isContractDetailReadOnly) {
      return;
    }

    if (hasContractWarehouseDraft) {
      setContractWarehouseRows((current) => [...current, contractWarehouseForm]);
      setContractWarehouseForm(initialContractWarehouseForm);
      setIsContractWarehouseFormOpen(true);
      return;
    }

    setIsContractWarehouseFormOpen(true);
  };
  const openNextContractOtherRow = () => {
    if (isContractDetailReadOnly) {
      return;
    }

    if (hasContractOtherDraft) {
      setContractOtherRows((current) => [...current, contractOtherForm]);
      setContractOtherForm(initialContractOtherForm);
      setIsContractOtherFormOpen(true);
      return;
    }

    setIsContractOtherFormOpen(true);
  };
  const openNextContractDocumentRow = () => {
    if (isContractDetailReadOnly) {
      return;
    }

    if (hasContractDocumentDraft) {
      setContractDocumentRows((current) => [...current, contractDocumentForm]);
      setContractDocumentForm(initialContractDocumentForm);
      setIsContractDocumentFormOpen(true);
      return;
    }

    setIsContractDocumentFormOpen(true);
  };
  const selectedCreateContractRow = customerCreateForm.contractCode
    ? contractRows.find((row) => row.code === customerCreateForm.contractCode) ?? null
    : null;
  const matchedCustomerCreateRow = customerCreateForm.customerName.trim()
    ? customerRows.find((row) => row.customer === customerCreateForm.customerName.trim()) ?? null
    : null;
  const customerCreateContractOptions = contractRows.filter((row) => {
    const keyword = customerCreateContractSearch.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    return `${row.code} ${row.customer} ${row.contractCompany}`.toLowerCase().includes(keyword);
  });
  const isBookingDetailsPage = currentPage === "bookings" && !!selectedBookingCode && !isCreatePage;
  useEffect(() => {
    const pageTitle = isCreatePage
      ? "Tạo yêu cầu mới | PI Digital"
      : isBookingDetailsPage && selectedBookingCode
        ? `${selectedBookingCode} | PI Digital`
        : isBookingListPage
          ? "Danh sách yêu cầu Booking | PI Digital"
          : isCustomerShipmentDetailsPage
            ? "Shipment Detail | PI Digital"
          : isCustomerCustomsPage
            ? "Customs (Hải quan) | PI Digital"
            : isCustomerInlandPage
              ? "Inland (Vận tải nội địa) | PI Digital"
              : isCustomerOverseaPage
                ? "Oversea (Vận tải quốc tế) | PI Digital"
          : isContractDetailsPage && selectedContractRow
            ? `${selectedContractRow.code} | PI Digital`
          : isCustomerDetailsPage && selectedCustomerRow
            ? `${selectedCustomerRow.customer} | PI Digital`
            : isServiceDetailsPage && selectedServiceDetailRow
              ? `${selectedServiceDetailDisplayName} | PI Digital`
            : isCustomerServicesPage
              ? "Cấu hình dịch vụ | PI Digital"
            : isCustomerCreatePage
              ? "Thêm mới khách hàng | PI Digital"
            : isCustomerContractCreatePage
              ? "Thêm mới hợp đồng | PI Digital"
            : isCustomerContractsPage
              ? "Quản lý hợp đồng | PI Digital"
              : isCustomerListPage
              ? "Danh sách khách hàng | PI Digital"
              : "PI Digital";

    const pageDescription = isCreatePage
      ? "Tạo mới yêu cầu booking trong hệ thống PI Digital."
      : isBookingDetailsPage && selectedBookingCode
        ? `Chi tiết yêu cầu booking ${selectedBookingCode} trong hệ thống PI Digital.`
        : isBookingListPage
          ? "Danh sách yêu cầu booking trong hệ thống PI Digital."
          : isCustomerShipmentDetailsPage
            ? "Màn hình tổng quan shipment trong hệ thống PI Digital."
          : isCustomerCustomsPage
            ? "Màn hình vận hành hải quan cho shipment trong hệ thống PI Digital."
            : isCustomerInlandPage
              ? "Màn hình vận hành vận tải nội địa cho shipment trong hệ thống PI Digital."
              : isCustomerOverseaPage
                ? "Màn hình vận hành vận tải quốc tế cho shipment trong hệ thống PI Digital."
          : isContractDetailsPage && selectedContractRow
            ? `Chi tiết hợp đồng ${selectedContractRow.code} trong hệ thống PI Digital.`
          : isCustomerDetailsPage && selectedCustomerRow
            ? `Chi tiết khách hàng ${selectedCustomerRow.customer} trong hệ thống PI Digital.`
            : isServiceDetailsPage && selectedServiceDetailRow
              ? `Chi tiết loại hình dịch vụ ${selectedServiceDetailDisplayName} trong hệ thống PI Digital.`
            : isCustomerServicesPage
              ? "Cấu hình dịch vụ dùng chung cho khách hàng và hợp đồng trong hệ thống PI Digital."
            : isCustomerCreatePage
              ? "Tạo mới hồ sơ khách hàng trong hệ thống PI Digital."
            : isCustomerContractCreatePage
              ? "Tạo mới hợp đồng trong hệ thống PI Digital."
            : isCustomerContractsPage
              ? "Quản lý hợp đồng trong hệ thống PI Digital."
              : isCustomerListPage
              ? "Danh sách khách hàng trong hệ thống PI Digital."
              : "PI Digital internal operations workspace.";

    document.title = pageTitle;

    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) {
      descriptionTag.setAttribute("content", pageDescription);
    }
  }, [
    isBookingDetailsPage,
    isBookingListPage,
    isCreatePage,
    isCustomerShipmentDetailsPage,
    isCustomerCustomsPage,
    isCustomerInlandPage,
    isCustomerOverseaPage,
    isCustomerCreatePage,
    isCustomerContractCreatePage,
    isContractDetailsPage,
    isCustomerContractsPage,
    isCustomerDetailsPage,
    isCustomerListPage,
    isCustomerServicesPage,
    isServiceDetailsPage,
    selectedServiceScope,
    selectedServiceDetailKey,
    selectedBookingCode,
    selectedContractRow,
    selectedCustomerRow
  ]);
  const customerShipmentRows = selectedCustomerRow
    ? allBookingRows
        .filter((row) => row.customer === selectedCustomerRow.customer)
        .sort((left, right) => parseDisplayDate(right.createdAt) - parseDisplayDate(left.createdAt))
    : [];
  const normalizedShipmentListSearchQuery = searchQuery.trim().toLowerCase();
  const selectedShipmentStatusFilters = selectedSearchFilters["Trạng thái"] ?? [];
  const selectedShipmentCargoTypes = selectedSearchFilters["Loại hàng"] ?? [];
  const selectedShipmentPackagingFilters = selectedSearchFilters["Đóng gói"] ?? [];
  const shipmentListRows = allBookingRows
    .filter((row) => {
      const shipmentCode = formatShipmentCodeFromBooking(row.code).toLowerCase();
      const matchesSearch =
        normalizedShipmentListSearchQuery.length === 0 ||
        [
          shipmentCode,
          row.customer.toLowerCase(),
          row.route.from.toLowerCase(),
          row.route.to.toLowerCase(),
          row.cargoType.toLowerCase(),
          row.packaging.toLowerCase()
        ].some((value) => value.includes(normalizedShipmentListSearchQuery));

      if (!matchesSearch) {
        return false;
      }

      if (
        selectedShipmentStatusFilters.length > 0 &&
        !selectedShipmentStatusFilters.includes(bookingStatusMeta[row.status].label)
      ) {
        return false;
      }

      if (selectedShipmentCargoTypes.length > 0 && !selectedShipmentCargoTypes.includes(row.cargoType)) {
        return false;
      }

      if (selectedShipmentPackagingFilters.length > 0 && !selectedShipmentPackagingFilters.includes(row.packaging)) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      const dateDiff = parseDisplayDate(right.createdAt) - parseDisplayDate(left.createdAt);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.code.localeCompare(right.code, "vi");
    });
  const shipmentListPageSize = 10;
  const shipmentListPageCount = Math.max(1, Math.ceil(shipmentListRows.length / shipmentListPageSize));
  const paginatedShipmentListRows = shipmentListRows.slice(
    (customerShipmentPage - 1) * shipmentListPageSize,
    customerShipmentPage * shipmentListPageSize
  );
  const shipmentListTableColumns =
    "minmax(148px,0.95fr) minmax(220px,1.45fr) minmax(200px,1.2fr) minmax(120px,0.7fr) minmax(150px,0.9fr) minmax(120px,0.8fr)";
  const selectedCustomerContracts = selectedCustomerRow
    ? contractRows.filter((row) => row.customer === selectedCustomerRow.customer).slice(0, 2)
    : [];
  const customerShipmentPageSize = 10;
  const customerShipmentPageCount = Math.max(1, Math.ceil(customerShipmentRows.length / customerShipmentPageSize));
  const visibleCustomerShipmentRows = customerShipmentRows.slice(
    (customerShipmentPage - 1) * customerShipmentPageSize,
    customerShipmentPage * customerShipmentPageSize
  );
  const customerListFilterConfigs: CustomerListFilterConfig[] = [
    {
      key: "contacts",
      label: "Khách hàng",
      placeholder: "Chọn khách hàng",
      searchPlaceholder: "Tìm theo tên khách hàng hoặc MST",
      options: sortSelectOptions(
        customerRows.map((row) => ({
          label: row.customer,
          value: row.customer,
          searchText: `${row.customer} ${row.taxId}`
        }))
      )
    },
    {
      key: "companies",
      label: "Công ty ký hợp đồng",
      placeholder: "Chọn công ty ký hợp đồng",
      searchPlaceholder: "Tìm theo công ty ký hợp đồng",
      options: sortSelectOptions(
        [...new Set(customerRows.map((row) => row.contractCompany))].map((company) => ({
          label: company,
          value: company
        }))
      )
    },
    {
      key: "services",
      label: "Dịch vụ",
      placeholder: "Chọn dịch vụ",
      searchPlaceholder: "Tìm theo dịch vụ",
      options: sortSelectOptions(
        [...new Set(customerRows.flatMap((row) => row.services))].map((service) => ({
          label: service,
          value: service
        }))
      )
    },
    {
      key: "groups",
      label: "Nhóm khách hàng",
      placeholder: "Chọn nhóm khách hàng",
      searchPlaceholder: "Tìm nhóm khách hàng",
      options: sortSelectOptions(
        [...new Set(customerRows.map((row) => row.customerGroup))].map((group) => ({
          label: group,
          value: group
        }))
      )
    }
  ];
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const moduleSearchPlaceholder = isCustomerContractsPage
    ? "Tìm kiếm theo Số HĐ, Tên KH, MST KH"
    : isCustomerShipmentListPage
      ? "Tìm kiếm theo Shipment ID, Khách hàng, Tuyến vận chuyển"
    : isCustomerServicesPage
      ? "Tìm kiếm theo Nhóm dịch vụ, Tên dịch vụ"
    : "Tìm kiếm theo tên KH, MST, Mã KH, Email, SĐT";
  const searchFilterSections = [
    {
      title: "Công ty phụ trách",
      items: ["PIL", "TDB"],
    },
    {
      title: "Phân khúc",
      items: ["VIP", "Strategic", "SME", "New", "Government"],
    },
  ] as const;
  const contractSearchFilterSections = [
    {
      title: "Trạng thái",
      items: contractStatusFilterOptions.map((option) => option.label),
    },
    {
      title: "Hiệu lực",
      items: ["Dưới 30 ngày", "Dưới 60 ngày", "Hết hiệu lực"],
    },
    {
      title: "Công ty",
      items: ["PIL", "TDB"],
    },
  ] as const;
  const serviceSearchFilterSections = [
    {
      title: "Nhóm dịch vụ",
      items: servicePageScopeOptions.map((service) => service.replace(/^[^\p{L}\p{N}]+\s*/u, "")),
    },
  ] as const;
  const shipmentSearchFilterSections = [
    {
      title: "Trạng thái",
      items: bookingStatuses.map((status) => bookingStatusMeta[status].label),
    },
    {
      title: "Loại hàng",
      items: [...new Set(allBookingRows.map((row) => row.cargoType))],
    },
    {
      title: "Đóng gói",
      items: [...new Set(allBookingRows.map((row) => row.packaging))],
    },
  ] as const;
  const customsBreadcrumb = `Home / Shipments / Shipment Detail / Customs / ${customsTradeType === "import" ? "Import" : "Export"}`;
  const customsShipmentMeta = [
    { label: "Mã shipment", value: "SHP-2026-0001" },
    { label: "Module", value: "Hải quan" },
    { label: "Loại", value: customsTradeType === "import" ? "Import" : "Export" },
    { label: "Cập nhật gần nhất", value: "12/03/2026 - An Phạm" }
  ] as const;
  const visibleCustomsCostRows = customsCostRowsByType[customsTradeType];
  const visibleCustomsDocumentRows = customsDocumentRowsByType[customsTradeType];
  const activeCustomsDocumentFilesRow =
    visibleCustomsDocumentRows.find((row) => row.id === activeCustomsDocumentFilesRowId) ?? null;
  const visibleCustomsAuditRows = customsAuditRowsByType[customsTradeType];
  const activeCustomsDebitNoteStatus = customsDebitNoteStatusByType[customsTradeType];
  const activeCustomsDebitNoteDueDate = customsDebitNoteDueDateByType[customsTradeType];
  const activeCustomsPaymentRequestStatus = customsPaymentRequestStatusByType[customsTradeType];
  const activeCustomsPaymentRequestDueDate = customsPaymentRequestDueDateByType[customsTradeType];
  const customsDocumentStatusMeta = {
    draft: { label: "Nháp", className: "bg-[#F3F4F6] text-[#4B5563]" },
    pending_confirmation: { label: "Chờ xác nhận", className: "bg-[#FFF4E5] text-[#C75B12]" },
    pending_payment: { label: "Chờ thanh toán", className: "bg-[#EEF3FF] text-[#245698]" },
    paid: { label: "Đã thanh toán", className: "bg-[#E7F6EC] text-[#18794E]" },
    overdue: { label: "Đã quá hạn", className: "bg-[#FFF1E8] text-[#C75B12]" },
    cancelled: { label: "Hủy", className: "bg-[#FDECEC] text-[#D14343]" }
  } as const;
  const getDebitNoteDocumentStatusMeta = (status: CustomsDebitNoteStatus) => {
    if (status === "pending_payment") {
      return { label: "Đã xác nhận", className: "bg-[#E7F6EC] text-[#18794E]" };
    }
    return customsDocumentStatusMeta[status];
  };
  const customsDebitNoteSteps = [
    { key: "draft" as const, label: "Nháp" },
    { key: "pending_confirmation" as const, label: "Chờ xác nhận" },
    { key: "pending_payment" as const, label: "Chờ thanh toán" },
    { key: "paid" as const, label: "Đã thanh toán" },
    { key: "overdue" as const, label: "Đã quá hạn" },
    { key: "cancelled" as const, label: "Hủy" }
  ];
  const visibleDebitNoteFlowSteps = [
    { key: "draft" as const, label: "Nháp" },
    { key: "pending_confirmation" as const, label: "Chờ xác nhận" },
    { key: "pending_payment" as const, label: "Đã xác nhận" }
  ];
  const visibleCustomsDebitNoteSteps = customsDebitNoteSteps.filter((step) => step.key !== "cancelled");
  const activeCustomsDebitNoteStepIndex = customsDebitNoteSteps.findIndex(
    (step) => step.key === activeCustomsDebitNoteStatus
  );
  const activeVisibleCustomsDebitNoteStepIndex = visibleDebitNoteFlowSteps.findIndex(
    (step) => step.key === activeCustomsDebitNoteStatus
  );
  const activeCustomsPaymentRequestStepIndex = customsDebitNoteSteps.findIndex(
    (step) => step.key === activeCustomsPaymentRequestStatus
  );
  const activeVisibleCustomsPaymentRequestStepIndex = visibleCustomsDebitNoteSteps.findIndex(
    (step) => step.key === activeCustomsPaymentRequestStatus
  );
  const activeCustomsDeclarationStatus = customsDeclarationStatusByType[customsTradeType];
  const activeVisibleCustomsDeclarationStepIndex = visibleDebitNoteFlowSteps.findIndex(
    (step) => step.key === activeCustomsDeclarationStatus
  );
  const customsDeclarationZoomScale = customsDeclarationZoom / 100;
  const visibleCustomsDebitNoteRows = visibleCustomsCostRows.filter(
    (row) =>
      customsDebitNoteForcedRowIds[customsTradeType].includes(row.id) ||
      [
        row.feeName,
        row.quantity,
        row.unit,
        row.price,
        row.amount,
        row.vatRate,
        row.vatAmount,
        row.total
      ].some((value) => value.trim() !== "")
  );
  const customsDebitNoteGrandTotal = formatVietnameseInteger(
    visibleCustomsDebitNoteRows.reduce((sum, row) => sum + parseVietnameseNumber(row.total), 0)
  );
  const visibleCustomsGeneratedDocumentFiles = (() => {
    if (!activeCustomsDocumentFilesRow) {
      return [] as Array<{ id: string; extension: string; name: string; uploadedAt: string }>;
    }

    const inferExtension = (fileName: string) => {
      const segments = fileName.split(".");
      return segments.length > 1 ? segments[segments.length - 1].toUpperCase() : "FILE";
    };

    if (activeCustomsDocumentFilesRow.fileNames.length > 0) {
      return activeCustomsDocumentFilesRow.fileNames.map((fileName, index) => ({
        id: `${activeCustomsDocumentFilesRow.id}-file-${index}`,
        extension: inferExtension(fileName),
        name: fileName,
        uploadedAt:
          activeCustomsDocumentFilesRow.updatedAt || `03/04/2026 ${String(9 + index).padStart(2, "0")}:1${index}`
      }));
    }

    const defaultFileSpecs =
      customsTradeType === "import"
        ? [
            { extension: "PDF", name: "INV_2026_0403.pdf" },
            { extension: "XLS", name: "PKL_2026_0403.xls" },
            { extension: "PDF", name: "BL_Draft_2026_0403.pdf" },
            { extension: "PDF", name: "AN_Notice_2026_0403.pdf" },
            { extension: "PDF", name: "DEBIT_2026_0403.pdf" },
            { extension: "PDF", name: "Giay_phep_chuyen_nganh.pdf" }
          ]
        : [
            { extension: "PDF", name: "INV_2026_0403.pdf" },
            { extension: "XLS", name: "PKL_2026_0403.xls" },
            { extension: "PDF", name: "BOOKING_2026_0403.pdf" }
          ];

    return defaultFileSpecs.map((file, index) => ({
      id: `${activeCustomsDocumentFilesRow.id}-generated-${index}`,
      extension: file.extension,
      name: file.name,
      uploadedAt: `03/04/2026 ${String(9 + index).padStart(2, "0")}:${index % 2 === 0 ? "15" : "41"}`
    }));
  })();
  const customsDebitNoteListRows: Array<{ id: string; title: string; timestamp: string; status: CustomsDebitNoteListStatus }> = [
    {
      id: `${customsTradeType}-debit-note-approved`,
      title: "Debit Note 03 04 2025",
      timestamp: "03 Apr 2025, 09:41",
      status: "approved"
    },
    {
      id: `${customsTradeType}-debit-note-cancelled-1`,
      title: "Debit Note 01 04 2025",
      timestamp: "01 Apr 2025, 14:20",
      status: "cancelled"
    },
    {
      id: `${customsTradeType}-debit-note-cancelled-2`,
      title: "Debit Note 28 03 2025",
      timestamp: "28 Mar 2025, 11:05",
      status: "cancelled"
    }
  ];
  const canCreateCustomsDebitNote = customsDebitNoteListRows.every((row) => row.status === "cancelled");
  const customsPaymentRequestRows = visibleCustomsDebitNoteRows.slice(0, 8);
  const customsValidationErrors = visibleCustomsDocumentRows
    .filter((row) => row.displayMode === "ATTACHMENT_REQUIRED" && row.fileNames.length === 0)
    .map((row) => ({
      rowId: row.id,
      relatedRow: row.documentName,
      message: "Chứng từ bắt buộc chưa được tải lên"
    }));
  const isCustomsSubmitDisabled = customsValidationErrors.length > 0;
  const inlandBreadcrumb = `Home / Shipments / Shipment Detail / Inland / ${inlandTradeType === "import" ? "Import" : "Export"}`;
  const inlandShipmentMeta = [
    { label: "Mã shipment", value: "SHP-2026-0001" },
    { label: "Module", value: "Vận tải nội địa" },
    { label: "Loại", value: inlandTradeType === "import" ? "Import" : "Export" },
    { label: "Cập nhật gần nhất", value: "12/03/2026 - An Phạm" }
  ] as const;
  const inlandDebitNoteListRows: Array<{ id: string; title: string; timestamp: string; status: CustomsDebitNoteListStatus }> = [
    {
      id: `${inlandTradeType}-debit-note-approved`,
      title: "Debit Note 03 04 2025",
      timestamp: "03 Apr 2025, 09:41",
      status: "approved"
    },
    {
      id: `${inlandTradeType}-debit-note-cancelled-1`,
      title: "Debit Note 01 04 2025",
      timestamp: "01 Apr 2025, 14:20",
      status: "cancelled"
    },
    {
      id: `${inlandTradeType}-debit-note-cancelled-2`,
      title: "Debit Note 28 03 2025",
      timestamp: "28 Mar 2025, 11:05",
      status: "cancelled"
    }
  ];
  const canCreateInlandDebitNote = inlandDebitNoteListRows.every((row) => row.status === "cancelled");
  const visibleInlandCostRows = inlandCostRowsByType[inlandTradeType];
  const visibleInlandDocumentRows = inlandDocumentRowsByType[inlandTradeType];
  const visibleInlandAuditRows = inlandAuditRowsByType[inlandTradeType];
  const activeInlandDebitNoteStatus = inlandDebitNoteStatusByType[inlandTradeType];
  const activeInlandDebitNoteDueDate = inlandDebitNoteDueDateByType[inlandTradeType];
  const activeInlandPaymentRequestStatus = inlandPaymentRequestStatusByType[inlandTradeType];
  const activeInlandPaymentRequestDueDate = inlandPaymentRequestDueDateByType[inlandTradeType];
  const activeInlandDebitNoteStepIndex = customsDebitNoteSteps.findIndex((step) => step.key === activeInlandDebitNoteStatus);
  const activeVisibleInlandDebitNoteStepIndex = visibleDebitNoteFlowSteps.findIndex(
    (step) => step.key === activeInlandDebitNoteStatus
  );
  const activeInlandPaymentRequestStepIndex = customsDebitNoteSteps.findIndex(
    (step) => step.key === activeInlandPaymentRequestStatus
  );
  const activeVisibleInlandPaymentRequestStepIndex = visibleCustomsDebitNoteSteps.findIndex(
    (step) => step.key === activeInlandPaymentRequestStatus
  );
  const visibleInlandDebitNoteRows = visibleInlandCostRows.filter(
    (row) =>
      inlandDebitNoteForcedRowIds[inlandTradeType].includes(row.id) ||
      [
        row.feeName,
        row.quantity,
        row.unit,
        row.price,
        row.amount,
        row.vatRate,
        row.vatAmount,
        row.total
      ].some((value) => value.trim() !== "")
  );
  const inlandDebitNoteGrandTotal = formatVietnameseInteger(
    visibleInlandDebitNoteRows.reduce((sum, row) => sum + parseVietnameseNumber(row.total), 0)
  );
  const inlandPaymentRequestRows = visibleInlandDebitNoteRows.slice(0, 8);
  const inlandValidationErrors = visibleInlandDocumentRows
    .filter((row) => row.required && row.files.length === 0)
    .map((row) => ({
      rowId: row.id,
      relatedRow: row.documentName,
      message:
        row.documentName === "BL"
          ? "Chứng từ BL chưa được tải lên"
          : `${row.documentName} thiếu file đính kèm`
    }));
  const isInlandSubmitDisabled = inlandValidationErrors.length > 0;
  const overseaBreadcrumb = `Home / Shipments / Shipment Detail / Oversea / ${overseaTradeType === "import" ? "Import" : "Export"}`;
  const overseaShipmentMeta = [
    { label: "Mã shipment", value: "SHP-2026-0001" },
    { label: "Module", value: "Vận tải quốc tế" },
    { label: "Loại", value: overseaTradeType === "import" ? "Import" : "Export" },
    { label: "Tuyến", value: "Shanghai → Haiphong" },
    { label: "Cập nhật gần nhất", value: "12/03/2026 - An Phạm" }
  ] as const;
  const visibleOverseaCostRows = overseaCostRowsByType[overseaTradeType];
  const visibleOverseaDocumentRows = overseaDocumentRowsByType[overseaTradeType];
  const visibleOverseaAuditRows = overseaAuditRowsByType[overseaTradeType];
  const overseaEnteredCostCount = visibleOverseaCostRows.filter((row) => row.amount.trim() !== "").length;
  const overseaRequiredDocumentCount = 0;
  const overseaCompletedDocumentCount = 0;
  const overseaCompletionPercent =
    visibleOverseaCostRows.length === 0 ? 0 : Math.round((overseaEnteredCostCount / visibleOverseaCostRows.length) * 100);
  const activeSearchFilterSections = isCustomerContractsPage
    ? contractSearchFilterSections
    : isCustomerShipmentListPage
      ? shipmentSearchFilterSections
    : isCustomerServicesPage
      ? serviceSearchFilterSections
      : searchFilterSections;
  const searchGroupOptions = ["Công ty phụ trách", "Tháng tạo", "Trạng thái"] as const;
  const contractSearchGroupOptions = ["Loại HĐ", "Loại dịch vụ", "Tháng tạo"] as const;
  const shipmentSearchGroupOptions = ["Khách hàng", "Trạng thái", "Tháng tạo"] as const;
  const activeSearchGroupOptions = isCustomerContractsPage
    ? contractSearchGroupOptions
    : isCustomerShipmentListPage
      ? shipmentSearchGroupOptions
    : isCustomerServicesPage
      ? []
      : searchGroupOptions;
  const currentPageTitle = isCustomerPage
    ? isCustomerCreatePage
      ? "Thêm mới"
      : isCustomerContractCreatePage
        ? "Hợp đồng"
        : isCustomerShipmentListPage
          ? "Shipment Lists"
        : isCustomerShipmentDetailsPage
          ? "Shipment Details"
        : isCustomerCustomsPage
          ? "Customs (Hải quan)"
          : isCustomerInlandPage
            ? "Inland (Nội địa)"
            : isCustomerOverseaPage
              ? "Oversea (Quốc tế)"
          : isCustomerContractsPage
            ? "Hợp đồng"
          : isServiceDetailsPage
            ? selectedServiceDetailDisplayName
          : isCustomerServicesPage
            ? selectedServiceScope
            : isCustomerDetailsPage && selectedCustomerRow
              ? selectedCustomerRow.customer
              : isContractDetailsPage && selectedContractRow
                ? selectedContractRow.code
                : "Khách hàng"
    : isCreatePage
      ? "Tạo yêu cầu mới"
      : selectedBookingCode
        ? selectedBookingCode
        : "Danh sách yêu cầu Booking";
  const shipmentWorkspaceTabs = [
    { key: "details" as const, label: "Shipment Details" },
    { key: "customs" as const, label: "Customs" },
    { key: "inland" as const, label: "Inland" },
    { key: "oversea" as const, label: "Oversea" }
  ];
  const shipmentDetailsBreadcrumb = "Home / Shipments / Shipment Detail";
  const currentShipmentBreadcrumb = isCustomerCustomsPage
    ? customsBreadcrumb
    : isCustomerInlandPage
      ? inlandBreadcrumb
      : isCustomerOverseaPage
        ? overseaBreadcrumb
        : shipmentDetailsBreadcrumb;
  const shipmentDetailWorkflowSteps = ["Nháp", "Xác nhận", "Đang thực hiện", "Hoàn thành", "Hủy"] as const;
  const shipmentDetailStaffOptions: SelectOption[] = [
    { label: "Nguyen Van A — CS", value: "Nguyen Van A — CS" },
    { label: "An Phạm — CS", value: "An Phạm — CS" },
    { label: "Tran Minh Duc — CS", value: "Tran Minh Duc — CS" }
  ];
  const shipmentDetailCharges: Array<{
    group: string;
    rows: Array<{
      code: string;
      name: string;
      location: string;
      unit: string;
      currency: string;
      price: string;
      containerType: string;
      quantity: string;
      total: string;
    }>;
    addLabel: string;
  }> = [
    {
      group: "Ocean freight (OF)",
      rows: [
        {
          code: "OF",
          name: "Ocean Freight",
          location: "OF",
          unit: "Per container",
          currency: "USD",
          price: "260",
          containerType: "20' DC",
          quantity: "1",
          total: "$260"
        }
      ],
      addLabel: "Thêm phí OF"
    },
    {
      group: "Local charges — POL & POD",
      rows: [
        {
          code: "THC",
          name: "Terminal Handling Charge",
          location: "POL",
          unit: "Per container",
          currency: "USD",
          price: "140",
          containerType: "20' DC",
          quantity: "1",
          total: "$140"
        },
        {
          code: "CLN",
          name: "Container Cleaning Fee",
          location: "POL",
          unit: "Per container",
          currency: "USD",
          price: "10",
          containerType: "20' DC",
          quantity: "1",
          total: "$10"
        },
        {
          code: "BL",
          name: "Bill of Lading Fee",
          location: "POL",
          unit: "Per bill",
          currency: "USD",
          price: "40",
          containerType: "20' DC",
          quantity: "1",
          total: "$40"
        },
        {
          code: "TR",
          name: "Telex Release Fee",
          location: "POL",
          unit: "Per bill",
          currency: "USD",
          price: "30",
          containerType: "20' DC",
          quantity: "1",
          total: "$30"
        },
        {
          code: "THC",
          name: "Terminal Handling Charge",
          location: "POD",
          unit: "Per container",
          currency: "USD",
          price: "150",
          containerType: "40' DC",
          quantity: "1",
          total: "$150"
        },
        {
          code: "CIC",
          name: "Container Imbalance Charge",
          location: "POD",
          unit: "Per container",
          currency: "USD",
          price: "20",
          containerType: "40' DC",
          quantity: "1",
          total: "$20"
        },
        {
          code: "DO",
          name: "Delivery Order Fee",
          location: "POD",
          unit: "Per bill",
          currency: "USD",
          price: "45",
          containerType: "40' DC",
          quantity: "1",
          total: "$45"
        },
        {
          code: "TRK",
          name: "Trucking Fee (POD → Warehouse)",
          location: "POD",
          unit: "Per trip",
          currency: "USD",
          price: "400",
          containerType: "40' DC",
          quantity: "1",
          total: "$400"
        }
      ],
      addLabel: "Thêm phí Local"
    }
  ];
  const shipmentDetailLclCharges: Array<{
    group: string;
    rows: Array<{
      code: string;
      name: string;
      location: string;
      unit: string;
      currency: string;
      price: string;
      minCharge: string;
      cbm: string;
      ton: string;
      wm: string;
    }>;
    addLabel: string;
  }> = [
    {
      group: "Ocean freight (OF)",
      rows: [
        {
          code: "OF",
          name: "Ocean Freight",
          location: "OF",
          unit: "Per W/M",
          currency: "USD",
          price: "",
          minCharge: "50",
          cbm: "0.00",
          ton: "0.000",
          wm: "auto"
        }
      ],
      addLabel: "Thêm phí OF"
    },
    {
      group: "Local charges — POL & POD",
      rows: [
        {
          code: "THC",
          name: "Terminal Handling Charge",
          location: "POL",
          unit: "Per W/M",
          currency: "USD",
          price: "",
          minCharge: "30",
          cbm: "0.00",
          ton: "0.000",
          wm: "auto"
        },
        {
          code: "CFS",
          name: "CFS Handling Fee",
          location: "POL",
          unit: "Per W/M",
          currency: "USD",
          price: "",
          minCharge: "20",
          cbm: "0.00",
          ton: "0.000",
          wm: "auto"
        },
        {
          code: "BL",
          name: "Bill of Lading Fee",
          location: "POL",
          unit: "Per bill",
          currency: "USD",
          price: "",
          minCharge: "N/A",
          cbm: "",
          ton: "",
          wm: "không áp dụng W/M"
        },
        {
          code: "TR",
          name: "Telex Release Fee",
          location: "POL",
          unit: "Per bill",
          currency: "USD",
          price: "",
          minCharge: "N/A",
          cbm: "",
          ton: "",
          wm: "không áp dụng W/M"
        },
        {
          code: "THC",
          name: "Terminal Handling Charge",
          location: "POD",
          unit: "Per W/M",
          currency: "USD",
          price: "",
          minCharge: "30",
          cbm: "0.00",
          ton: "0.000",
          wm: "auto"
        },
        {
          code: "CFS",
          name: "CFS Destuffing Fee",
          location: "POD",
          unit: "Per W/M",
          currency: "USD",
          price: "",
          minCharge: "25",
          cbm: "0.00",
          ton: "0.000",
          wm: "auto"
        },
        {
          code: "DO",
          name: "Delivery Order Fee",
          location: "POD",
          unit: "Per bill",
          currency: "USD",
          price: "",
          minCharge: "N/A",
          cbm: "",
          ton: "",
          wm: "không áp dụng W/M"
        },
        {
          code: "TRK",
          name: "Trucking Fee (CFS → Warehouse)",
          location: "POD",
          unit: "Per trip",
          currency: "USD",
          price: "",
          minCharge: "N/A",
          cbm: "",
          ton: "",
          wm: "không áp dụng W/M"
        }
      ],
      addLabel: "Thêm phí Local"
    }
  ];
  const [shipmentDetailChargeGroups, setShipmentDetailChargeGroups] = useState(() =>
    shipmentDetailCharges.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row }))
    }))
  );
  const [shipmentDetailLclChargeGroups, setShipmentDetailLclChargeGroups] = useState(() =>
    shipmentDetailLclCharges.map((group) => ({
      ...group,
      rows: group.rows.map((row) => ({ ...row }))
    }))
  );
  const shipmentDetailSubtotalValue = (
    shipmentDetailCargoType === "LCL" ? shipmentDetailLclChargeGroups : shipmentDetailChargeGroups
  ).reduce((groupTotal, group) => {
    return (
      groupTotal +
      group.rows.reduce((rowTotal, row) => {
        const price = Number(String(row.price).replace(/,/g, "")) || 0;
        if ("quantity" in row) {
          const quantity = Number(String(row.quantity).replace(/,/g, "")) || 0;
          return rowTotal + price * quantity;
        }

        const cbm = Number(String(row.cbm).replace(/,/g, "")) || 0;
        const ton = Number(String(row.ton).replace(/,/g, "")) || 0;
        const minCharge = Number(String(row.minCharge).replace(/[^\d.]/g, "")) || 0;
        const wmBase = Math.max(cbm, ton);
        if (wmBase <= 0) {
          return rowTotal;
        }
        return rowTotal + Math.max(price * wmBase, minCharge);
      }, 0)
    );
  }, 0);
  const shipmentDetailVatValue = shipmentDetailSubtotalValue * 0.08;
  const shipmentDetailTotalValue = shipmentDetailSubtotalValue + shipmentDetailVatValue;
  const shipmentDetailCurrencyFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const selectedShipmentDetailPol =
    shipmentDetailPolOptions.find((option) => option.value === shipmentDetailPol) ?? shipmentDetailPolOptions[0];
  const selectedShipmentDetailPod =
    shipmentDetailPodOptions.find((option) => option.value === shipmentDetailPod) ?? shipmentDetailPodOptions[0];
  const shipmentDetailChargeSummary = {
    subtotal: `$${shipmentDetailCurrencyFormatter.format(shipmentDetailSubtotalValue)}`,
    vat: `$${shipmentDetailCurrencyFormatter.format(shipmentDetailVatValue)}`,
    total: `$${shipmentDetailCurrencyFormatter.format(shipmentDetailTotalValue)}`
  };
  const isCustomerSelectionMode = isCustomerListPage && selectedCustomerRowKeys.length > 0;
  const customerCreateWorkflowSteps =
    isCustomerDetailsPage && selectedCustomerRow?.status === "locked"
      ? (["Nháp", "Đang hoạt động", "Đã khóa"] as const)
      : (["Nháp", "Đang hoạt động"] as const);
  const contractCreateWorkflowSteps: readonly string[] = (
    isContractDetailsPage && activeContractDetailStatus === "expiring_soon"
      ? ["Nháp", "Chờ duyệt", "Đã duyệt", "Đang hiệu lực", "Sắp hết hạn"]
      : isContractDetailsPage && activeContractDetailStatus === "expired"
        ? ["Nháp", "Chờ duyệt", "Đã duyệt", "Đang hiệu lực", "Hết hạn"]
        : isContractDetailsPage && activeContractDetailStatus === "terminated"
          ? ["Nháp", "Chờ duyệt", "Đã duyệt", "Đang hiệu lực", "Hủy hợp đồng"]
        : ["Nháp", "Chờ duyệt", "Đã duyệt", "Đang hiệu lực"]
  );
  const customerCreateSummaryRow = isCustomerDetailsPage ? selectedCustomerRow : matchedCustomerCreateRow;
  const shouldHideCustomerDetailMetrics = isCustomerDetailsPage && selectedCustomerRow?.status === "draft";
  const relatedCustomerContracts = customerCreateSummaryRow
    ? contractRows.filter((row) => row.customer === customerCreateSummaryRow.customer)
    : [];
  const customerCreateHeaderMetrics = [
    {
      label: "Hợp đồng",
      value: shouldHideCustomerDetailMetrics
        ? 0
        : relatedCustomerContracts.length,
      contractCode: relatedCustomerContracts[0]?.code ?? null,
    },
    {
      label: "Shipments",
      value: shouldHideCustomerDetailMetrics ? 0 : customerCreateSummaryRow?.totalBookings ?? 0,
      contractCode: null,
    },
    {
      label: "Báo giá",
      value: shouldHideCustomerDetailMetrics
        ? 0
        : customerCreateSummaryRow
          ? Math.max(1, Math.ceil(customerCreateSummaryRow.totalBookings / 2))
          : 0,
      contractCode: null,
    },
  ].filter((item) => item.value > 0);
  const contractCreateHeaderMetrics = [
    { label: "Báo giá", value: 0 },
    { label: "Shipments", value: 0 },
    { label: "Hóa đơn", value: 0 },
    { label: "Debit note", value: 0 },
  ] as const;
  const customerCreateActivityRows = [
    {
      actor: currentUserName,
      time: "Hôm nay lúc 15:26",
      message: "Khởi tạo hồ sơ khách hàng và cập nhật thông tin pháp lý."
    }
  ] as const;
  const contractCreateActivityRows = [
    {
      actor: currentUserName,
      time: "Hôm nay lúc 15:26",
      message: "Khởi tạo hồ sơ hợp đồng mới và chuẩn bị thông tin hiệu lực."
    }
  ] as const;
  const customerDetailActivityRows = [
    {
      actor: currentUserName,
      time: "Hôm nay lúc 15:26",
      message: "Khởi tạo hồ sơ khách hàng và cập nhật thông tin pháp lý."
    },
    {
      actor: "Nguyễn Minh Châu",
      time: "Hôm nay lúc 14:48",
      message: "Bổ sung người liên hệ chính và xác nhận email giao dịch."
    },
    {
      actor: "Trần Gia Hưng",
      time: "Hôm nay lúc 13:55",
      message: "Cập nhật công ty phụ trách PIL và gắn phân khúc Strategic."
    },
    {
      actor: "Lê Bảo Trân",
      time: "Hôm nay lúc 11:20",
      message: "Thêm tuyến hàng export Việt Nam đi Singapore, Incoterm FOB."
    },
    {
      actor: "System",
      time: "Hôm qua lúc 18:05",
      message: "Tạo mã khách hàng tự động và đồng bộ trạng thái hồ sơ."
    }
  ] as const;
  const activeCustomerActivityRows = isCustomerDetailsPage ? customerDetailActivityRows : customerCreateActivityRows;
  const customerCreateActivityGroups = [
    {
      label: "Hôm nay",
      entries: activeCustomerActivityRows.filter((entry) => entry.time.startsWith("Hôm nay"))
    },
    {
      label: "Hôm qua",
      entries: activeCustomerActivityRows.filter((entry) => entry.time.startsWith("Hôm qua"))
    }
  ].filter((group) => group.entries.length > 0);
  const activeContractActivityRows = isContractDetailsPage && selectedContractRow
    ? [
        {
          actor: "Admin PI Logistics",
          time: "Hôm nay lúc 09:10",
          message: `Khởi tạo hợp đồng ${selectedContractRow.code} cho ${selectedContractRow.customer}.`
        },
        {
          actor: "Sales Team",
          time: "Hôm nay lúc 14:25",
          message: `Áp dụng dịch vụ: ${selectedContractRow.services.join(", ")}.`
        },
        {
          actor: "Legal Team",
          time: "Hôm qua lúc 08:45",
          message: `Trạng thái hợp đồng được cập nhật thành ${contractStatusMeta[selectedContractRow.status].label}.`
        }
      ]
    : contractCreateActivityRows;
  const contractCreateActivityGroups = [
    {
      label: "Hôm nay",
      entries: activeContractActivityRows.filter((entry) => entry.time.startsWith("Hôm nay"))
    },
    {
      label: "Hôm qua",
      entries: activeContractActivityRows.filter((entry) => entry.time.startsWith("Hôm qua"))
    }
  ].filter((group) => group.entries.length > 0);
  const isAnyCreatePage =
    isCreatePage || isCustomerCreateLikePage || isCustomerContractCreatePage || isContractDetailsPage || isServiceDetailsPage;
  const listPageSize = 80;
  const customerTaxIdByName = new Map(customerRows.map((row) => [row.customer, row.taxId] as const));
  const selectedContractSearchStatuses = selectedSearchFilters["Trạng thái"] ?? [];
  const selectedContractSearchExpiry = selectedSearchFilters["Hiệu lực"] ?? [];
  const selectedContractSearchCompanies = selectedSearchFilters["Công ty"] ?? [];
  const visibleCustomerRows = customerRows.filter((row) => {
    if (
      customerListFilters.contacts.length > 0 &&
      !customerListFilters.contacts.includes(row.customer)
    ) {
      return false;
    }

    if (
      customerListFilters.companies.length > 0 &&
      !row.contractCompany.split(" / ").some((company) => customerListFilters.companies.includes(company))
    ) {
      return false;
    }

    if (
      customerListFilters.services.length > 0 &&
      !row.services.some((service) => customerListFilters.services.includes(service))
    ) {
      return false;
    }

    if (
      customerListFilters.groups.length > 0 &&
      !customerListFilters.groups.includes(row.customerGroup)
    ) {
      return false;
    }

    if (customerStatusFilters.length > 0 && !customerStatusFilters.includes(row.status)) {
      return false;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

    return [row.customer, row.taxId, row.contractCompany, row.contactName, row.email, row.phone, String(row.totalBookings)]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchQuery);
  });
  const visibleContractRows = contractRows
    .filter((row) => {
      if (customerListFilters.contacts.length > 0 && !customerListFilters.contacts.includes(row.customer)) {
        return false;
      }

      if (
        customerListFilters.companies.length > 0 &&
        !customerListFilters.companies.includes(row.contractCompany)
      ) {
        return false;
      }

      if (contractStatusFilters.length > 0 && !contractStatusFilters.includes(row.status)) {
        return false;
      }

      if (isCustomerContractsPage && selectedContractSearchStatuses.length > 0) {
        const contractStatusLabel = contractStatusMeta[row.status].label;
        if (!selectedContractSearchStatuses.includes(contractStatusLabel)) {
          return false;
        }
      }

      if (
        customerListFilters.services.length > 0 &&
        !row.services.some((service) => customerListFilters.services.includes(service))
      ) {
        return false;
      }

      const expiryValue = row.status === "draft" ? "-" : row.term.split(" - ")[1] ?? row.term;
      if (customerListFilters.expiryDates.length > 0 && !customerListFilters.expiryDates.includes(expiryValue)) {
        return false;
      }

      const expiryTimestamp = row.status === "draft" ? Number.NaN : parseDisplayDate(row.term.split(" - ")[1] ?? row.term);
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const daysUntilExpiry = Number.isNaN(expiryTimestamp)
        ? Number.POSITIVE_INFINITY
        : Math.ceil((expiryTimestamp - startOfToday) / (1000 * 60 * 60 * 24));

      if (isCustomerContractsPage && selectedContractSearchExpiry.length > 0) {
        const matchesExpiry = selectedContractSearchExpiry.some((item) => {
          if (item === "Hết hiệu lực") {
            return row.status === "expired" || (!Number.isNaN(expiryTimestamp) && daysUntilExpiry < 0);
          }

          if (row.status === "draft" || Number.isNaN(expiryTimestamp) || daysUntilExpiry < 0) {
            return false;
          }

          if (item === "Dưới 30 ngày") {
            return daysUntilExpiry < 30;
          }

          if (item === "Dưới 60 ngày") {
            return daysUntilExpiry < 60;
          }

          return false;
        });

        if (!matchesExpiry) {
          return false;
        }
      }

      if (isCustomerContractsPage && selectedContractSearchCompanies.length > 0) {
        if (!selectedContractSearchCompanies.includes(row.contractCompany)) {
          return false;
        }
      }

      if (contractExpiryRange.from || contractExpiryRange.to) {
        if (row.status === "draft") {
          return false;
        }

        if (contractExpiryRange.from && expiryTimestamp < parseIsoDate(contractExpiryRange.from)) {
          return false;
        }

        if (contractExpiryRange.to && expiryTimestamp > parseIsoDate(contractExpiryRange.to)) {
          return false;
        }
      }

      if (!normalizedSearchQuery) {
        return true;
      }

      return [row.code, row.customer, customerTaxIdByName.get(row.customer) ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearchQuery);
    })
    .sort((left, right) => {
      const contractStatusSortPriority: Record<ContractRow["status"], number> = {
        expiring_soon: 0,
        pending: 1,
        accepted: 2,
        active: 3,
        draft: 4,
        expired: 5,
        terminated: 6
      };
      const priorityDiff =
        contractStatusSortPriority[left.status] - contractStatusSortPriority[right.status];

      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      const leftExpiry = left.status === "draft" ? Number.POSITIVE_INFINITY : parseDisplayDate(left.term.split(" - ")[1] ?? left.term);
      const rightExpiry =
        right.status === "draft" ? Number.POSITIVE_INFINITY : parseDisplayDate(right.term.split(" - ")[1] ?? right.term);

      if (leftExpiry !== rightExpiry) {
        return leftExpiry - rightExpiry;
      }

      return left.code.localeCompare(right.code, "vi");
    });
  const visibleServiceConfigRows = serviceConfigNestedRows.filter((row) => {
    if (row.service !== selectedServiceScope) {
      return false;
    }

    if (!normalizedSearchQuery) {
      return true;
    }

    return [row.serviceLabelWithoutEmoji, row.item].join(" ").toLowerCase().includes(normalizedSearchQuery);
  });
  const bookingListPageCount = Math.max(1, Math.ceil(visibleRows.length / listPageSize));
  const paginatedBookingRows = visibleRows.slice(
    (bookingListPageNumber - 1) * listPageSize,
    bookingListPageNumber * listPageSize
  );
  const customerListPageCount = Math.max(1, Math.ceil(visibleCustomerRows.length / listPageSize));
  const paginatedCustomerRows = visibleCustomerRows.slice(
    (customerListPageNumber - 1) * listPageSize,
    customerListPageNumber * listPageSize
  );
  const contractListPageCount = Math.max(1, Math.ceil(visibleContractRows.length / listPageSize));
  const paginatedContractRows = visibleContractRows.slice(
    (contractListPageNumber - 1) * listPageSize,
    contractListPageNumber * listPageSize
  );
  const serviceConfigListPageCount = Math.max(1, Math.ceil(visibleServiceConfigRows.length / listPageSize));
  const paginatedServiceConfigRows = visibleServiceConfigRows.slice(
    (serviceConfigListPageNumber - 1) * listPageSize,
    serviceConfigListPageNumber * listPageSize
  );
  const activeListPagination = isBookingListPage
    ? {
        currentPage: bookingListPageNumber,
        pageCount: bookingListPageCount,
        total: visibleRows.length,
        setPage: setBookingListPageNumber
      }
    : isCustomerListPage
      ? {
          currentPage: customerListPageNumber,
          pageCount: customerListPageCount,
          total: visibleCustomerRows.length,
          setPage: setCustomerListPageNumber
        }
      : isCustomerContractsPage
        ? {
            currentPage: contractListPageNumber,
            pageCount: contractListPageCount,
            total: visibleContractRows.length,
            setPage: setContractListPageNumber
          }
        : isCustomerServicesPage
          ? {
              currentPage: serviceConfigListPageNumber,
              pageCount: serviceConfigListPageCount,
              total: visibleServiceConfigRows.length,
              setPage: setServiceConfigListPageNumber
            }
          : null;
  const activeListRangeStart = activeListPagination
    ? activeListPagination.total === 0
      ? 0
      : (activeListPagination.currentPage - 1) * listPageSize + 1
    : 0;
  const activeListRangeEnd = activeListPagination
    ? Math.min(activeListPagination.currentPage * listPageSize, activeListPagination.total)
    : 0;
  const customerDetailNavigationRows = visibleCustomerRows.length > 0 ? visibleCustomerRows : customerRows;
  const customerDetailIndex = selectedCustomerRow
    ? customerDetailNavigationRows.findIndex((row) => row.customer === selectedCustomerRow.customer)
    : -1;
  const previousCustomerDetail =
    customerDetailIndex > 0 ? customerDetailNavigationRows[customerDetailIndex - 1] : null;
  const nextCustomerDetail =
    customerDetailIndex >= 0 && customerDetailIndex < customerDetailNavigationRows.length - 1
      ? customerDetailNavigationRows[customerDetailIndex + 1]
      : null;
  const contractDetailNavigationRows = visibleContractRows.length > 0 ? visibleContractRows : contractRows;
  const contractDetailIndex = selectedContractRow
    ? contractDetailNavigationRows.findIndex((row) => row.code === selectedContractRow.code)
    : -1;
  const previousContractDetail =
    contractDetailIndex > 0 ? contractDetailNavigationRows[contractDetailIndex - 1] : null;
  const nextContractDetail =
    contractDetailIndex >= 0 && contractDetailIndex < contractDetailNavigationRows.length - 1
      ? contractDetailNavigationRows[contractDetailIndex + 1]
      : null;
  const selectedCustomerStatusLabel = selectedCustomerRow
    ? customerAccountStatusMeta[selectedCustomerRow.status].label
    : "";
  const selectedCustomerToggleLabel = selectedCustomerRow?.status === "locked" ? "Mở khóa" : "Khóa";
  const selectedContractCustomerRow = selectedContractRow
    ? customerRows.find((row) => row.customer === selectedContractRow.customer) ?? null
    : null;
  const contractHasInternationalService = contractCreateForm.services.includes("🌍 Vận tải quốc tế");
  const contractHasDomesticService = contractCreateForm.services.includes("🚚 Vận tải nội địa");
  const contractHasCustomsService = contractCreateForm.services.includes("📑 Thủ tục hải quan");
  const contractHasWarehouseService = contractCreateForm.services.includes("🏭 Kho bãi & phân phối");
  const contractHasOtherService = contractCreateForm.services.includes("🧩 Dịch vụ khác");
  const selectedCustomsServiceItems = contractCreateForm.serviceItems["📑 Thủ tục hải quan"] ?? [];
  const selectedWarehouseServiceItems = contractCreateForm.serviceItems["🏭 Kho bãi & phân phối"] ?? [];
  const contractCreateTabs = [
    contractHasInternationalService ? { key: "services", label: "Vận tải quốc tế" } : null,
    contractHasDomesticService ? { key: "domestic", label: "Vận tải nội địa" } : null,
    contractHasCustomsService ? { key: "customs", label: "Thủ tục hải quan" } : null,
    contractHasWarehouseService ? { key: "warehouse", label: "Kho bãi & phân phối" } : null,
    contractHasOtherService ? { key: "other", label: "Dịch vụ khác" } : null,
    { key: "documents", label: "Chứng từ hợp đồng" },
    { key: "notes", label: "Ghi chú" }
  ].filter(
    (
      tab
    ): tab is {
      key: "services" | "domestic" | "customs" | "warehouse" | "other" | "documents" | "notes";
      label: string;
    } => tab !== null
  );
  const contractDetailShipmentRows = selectedContractCustomerRow
    ? allBookingRows
        .filter((row) => row.customer === selectedContractCustomerRow.customer)
        .sort((left, right) => parseDisplayDate(right.createdAt) - parseDisplayDate(left.createdAt))
        .slice(0, 5)
    : [];
  const selectedContractExpiry =
    selectedContractRow?.status === "draft"
      ? "-"
      : selectedContractRow?.term.split(" - ")[1] ?? selectedContractRow?.term ?? "-";
  const contractHistoryEntries = selectedContractRow
    ? [
        {
          title: "Tạo hợp đồng",
          meta: "Admin PI Logistics · 17/03/2026 09:10",
          detail: `Khởi tạo hợp đồng ${selectedContractRow.code} cho ${selectedContractRow.customer}.`
        },
        {
          title: "Cập nhật dịch vụ",
          meta: "Sales Team · 18/03/2026 14:25",
          detail: `Áp dụng dịch vụ: ${selectedContractRow.services.join(", ")}.`
        },
        {
          title: "Đồng bộ trạng thái",
          meta: "Legal Team · 19/03/2026 08:45",
          detail: `Trạng thái hợp đồng được cập nhật thành ${contractStatusMeta[selectedContractRow.status].label}.`
        }
      ]
    : [];
  const customerHistoryEntries = selectedCustomerRow
    ? [
        {
          title: "Cập nhật nhóm khách hàng",
          meta: "Admin PI Logistics · 17/03/2026 09:30",
          detail: `Gán nhóm khách hàng: ${selectedCustomerRow.customerGroup}.`
        },
        {
          title: "Bổ sung dịch vụ đang sử dụng",
          meta: "CS Team · 16/03/2026 15:10",
          detail: `Đã cập nhật ${selectedCustomerRow.services.join(", ")}.`
        },
        {
          title: "Khởi tạo hồ sơ khách hàng",
          meta: "System · 15/03/2026 10:00",
          detail: `Tạo hồ sơ cho ${selectedCustomerRow.customer}.`
        }
      ]
    : [];
  const portSearchOptions = Object.entries(portFilterLabels).map(([code, label]) => ({
    code,
    label,
    searchText: `${code} ${label}`.toLowerCase()
  }));

  useEffect(() => {
    const syncBookingFromUrl = () => {
      const nextParams = new URLSearchParams(window.location.search);
      const nextPage = nextParams.get("page") === "customers" ? "customers" : "bookings";
        const nextShipmentTab =
          nextParams.get("shipment_tab") === "list"
            ? "list"
            : 
        nextParams.get("shipment_tab") === "customs"
          ? "customs"
          : nextParams.get("shipment_tab") === "inland"
            ? "inland"
            : nextParams.get("shipment_tab") === "oversea"
              ? "oversea"
              : nextParams.get("view") === "customs"
                ? "customs"
                : nextParams.get("view") === "inland"
                  ? "inland"
                  : nextParams.get("view") === "oversea"
                    ? "oversea"
                    : nextParams.get("view") === "shipments"
                      ? "list"
                      : "details";
      setCurrentPage(nextPage);
      setShipmentWorkspaceTab(nextShipmentTab);
      setCustomerSubPage(
        nextPage === "customers"
          ? nextParams.get("view") === "contracts"
            ? "contracts"
            : nextParams.get("view") === "services"
              ? "services"
              : nextParams.get("view") === "shipments" || nextParams.get("view") === "customs" || nextParams.get("view") === "inland" || nextParams.get("view") === "oversea"
                ? "shipments"
              : nextParams.get("view") === "create-contract"
                ? "create-contract"
              : nextParams.get("view") === "create-customer"
                ? "create"
              : "list"
          : "list"
      );
      setSelectedCustomerKey(
        nextPage === "customers" &&
          nextParams.get("view") !== "contracts" &&
          nextParams.get("view") !== "services" &&
          nextParams.get("view") !== "shipments" &&
          nextParams.get("view") !== "customs" &&
          nextParams.get("view") !== "inland" &&
          nextParams.get("view") !== "oversea" &&
          nextParams.get("view") !== "create-contract" &&
          nextParams.get("view") !== "create-customer"
          ? nextParams.get("customer")
          : null
      );
      setSelectedContractCode(
        nextPage === "customers" && nextParams.get("view") === "contracts" ? nextParams.get("contract") : null
      );
      setSelectedShipmentCode(
        nextPage === "customers" &&
          (nextParams.get("view") === "shipments" ||
            nextParams.get("view") === "customs" ||
            nextParams.get("view") === "inland" ||
            nextParams.get("view") === "oversea")
          ? nextParams.get("shipment")
          : null
      );
      const nextServiceScope = nextPage === "customers" && nextParams.get("view") === "services"
        ? nextParams.get("service")
        : null;
      if (nextServiceScope && servicePageScopeOptions.includes(nextServiceScope as (typeof servicePageScopeOptions)[number])) {
        setSelectedServiceScope(nextServiceScope as (typeof servicePageScopeOptions)[number]);
      }
      const nextServiceItem = nextPage === "customers" && nextParams.get("view") === "services"
        ? nextParams.get("service_item")
        : null;
      setSelectedServiceDetailKey(
        nextServiceScope &&
          nextServiceItem &&
          serviceConfigNestedRows.some((row) => row.service === nextServiceScope && row.item === nextServiceItem)
          ? `${nextServiceScope}__${nextServiceItem}`
          : null
      );
      setSelectedBookingCode(
        nextPage === "customers"
          ? null
          : nextParams.get("view") === "create"
            ? CREATE_BOOKING_CODE
            : nextParams.get("booking")
      );
    };

    syncBookingFromUrl();
    window.addEventListener("popstate", syncBookingFromUrl);

    return () => window.removeEventListener("popstate", syncBookingFromUrl);
  }, []);

  useEffect(() => {
    if (isCustomerShipmentPage) {
      setOpenSidebarGroups(["Quản lý Shipment"]);
      return;
    }

    if (isCustomerPage) {
      setOpenSidebarGroups((current) => {
        const next = current.filter((title) => title !== "Quản lý Shipment");
        return next.includes("Quản lý khách hàng") ? next : [...next, "Quản lý khách hàng"];
      });
      return;
    }

    setOpenSidebarGroups((current) =>
      current.filter((title) => title !== "Quản lý khách hàng" && title !== "Quản lý Shipment")
    );
  }, [isCustomerShipmentPage, isCustomerPage]);

  useEffect(() => {
    setCustomerShipmentPage(1);
  }, [selectedCustomerKey]);

  useEffect(() => {
    if (isCustomerShipmentListPage) {
      setCustomerShipmentPage(1);
    }
  }, [isCustomerShipmentListPage, searchQuery, selectedSearchFilters]);

  useEffect(() => {
    if (isCustomerShipmentListPage) {
      setCustomerShipmentPage((current) => Math.min(current, shipmentListPageCount));
    }
  }, [isCustomerShipmentListPage, shipmentListPageCount]);

  useEffect(() => {
    if (!selectedServiceDetailRow) {
      setServiceDetailFeeRows([]);
      setServiceDetailFeeForm(initialServiceDetailFeeForm);
      setIsServiceDetailFeeFormOpen(false);
      return;
    }

    setServiceDetailFeeRows((serviceDetailFeePresets[selectedServiceDetailRow.item] ?? []).map((row) => ({ ...row })));
    setServiceDetailFeeForm(initialServiceDetailFeeForm);
    setIsServiceDetailFeeFormOpen(false);
  }, [selectedServiceDetailKey]);

  useEffect(() => {
    if (!selectedCustomerRow) {
      return;
    }

    if (!customerDetailInitialForm) {
      return;
    }

    const isDraftDetailCustomer = selectedCustomerRow.status === "draft";

    setCustomerCreateForm(customerDetailInitialForm);
    setCustomerAddressForm(
      isDraftDetailCustomer ? customerDetailSeededAddressRows[0] ?? initialCustomerAddressForm : initialCustomerAddressForm
    );
    setCustomerAddressRows(isDraftDetailCustomer ? [] : customerDetailSeededAddressRows);
    setIsCustomerAddressFormOpen(isDraftDetailCustomer);
    setCustomerContactForm(
      isDraftDetailCustomer ? customerDetailSeededContactRows[0] ?? initialCustomerContactForm : initialCustomerContactForm
    );
    setCustomerContactRows(isDraftDetailCustomer ? [] : customerDetailSeededContactRows);
    setIsCustomerContactFormOpen(isDraftDetailCustomer);
    setCustomerRouteForm(
      isDraftDetailCustomer ? customerDetailSeededRouteRows[0] ?? initialCustomerRouteForm : initialCustomerRouteForm
    );
    setCustomerRouteRows(isDraftDetailCustomer ? [] : customerDetailSeededRouteRows);
    setIsCustomerRouteFormOpen(isDraftDetailCustomer);
    setCustomerInternalNotes(customerDetailInitialNotes);
    setCustomerCreateErrors({});
    setCustomerCreateWorkspaceTab("address");
  }, [selectedCustomerKey]);

  useEffect(() => {
    setCustomerDetailNote("");
  }, [selectedContractCode]);

  useEffect(() => {
    if (!isContractDetailsPage || !selectedContractRow) {
      return;
    }

    const [validFrom, validTo] = selectedContractRow.term.split(" - ");
    const nextServices: string[] = [];
    const nextServiceItems: Record<string, string[]> = {};
    const nextRateRows: ContractRateFormState[] = [];
    const nextDomesticRows: ContractDomesticServiceFormState[] = [];

    selectedContractRow.services.forEach((service) => {
      if (service === "Ocean FCL" || service === "Ocean LCL" || service === "Air Freight") {
        if (!nextServices.includes("🌍 Vận tải quốc tế")) {
          nextServices.push("🌍 Vận tải quốc tế");
        }

        nextRateRows.push({
          fareCode: "OCEAN-FRT",
          fareName: service === "Air Freight" ? "Air Freight" : "Ocean Freight",
          pol: "",
          pod: "",
          carrier: "",
          mod:
            service === "Ocean FCL"
              ? "FCL"
              : service === "Ocean LCL"
                ? "LCL (CBM)"
                : "Air (KG)",
          container: "20GP",
          rate: "",
          currency: "USD",
          unit: service === "Air Freight" ? "/KG" : "/container",
          effectiveFrom: validFrom ?? "",
          effectiveTo: validTo ?? selectedContractRow.term
        });
      }

      if (service === "Trucking") {
        if (!nextServices.includes("🚚 Vận tải nội địa")) {
          nextServices.push("🚚 Vận tải nội địa");
        }

        nextDomesticRows.push({
          fareCode: "TRUCK-DEL",
          fareName: "Trucking Fee",
          pickupPoint: "",
          deliveryPoint: "",
          unit: "/chuyến",
          container: "20GP",
          currency: "VND",
          rate: "",
          linkedWarehouse: ""
        });
      }

      if (service === "Custom Clearance") {
        if (!nextServices.includes("📑 Thủ tục hải quan")) {
          nextServices.push("📑 Thủ tục hải quan");
        }

        nextServiceItems["📑 Thủ tục hải quan"] = ["Khai báo hải quan xuất khẩu"];
      }

      if (service === "Warehouse") {
        if (!nextServices.includes("🏭 Kho bãi & phân phối")) {
          nextServices.push("🏭 Kho bãi & phân phối");
        }

        nextServiceItems["🏭 Kho bãi & phân phối"] = ["Lưu kho"];
      }
    });

    setContractCreateErrors({});
    setContractCreateForm({
      ...initialContractCreateForm,
      code: selectedContractRow.code,
      customer: selectedContractRow.customer,
      contractCompany: selectedContractRow.contractCompany.split(" / ")[0] ?? selectedContractRow.contractCompany,
      contractType: selectedContractRow.contractType,
      signedAt: selectedContractRow.status === "draft" ? "" : selectedContractRow.signedAt,
      validFrom: validFrom ?? "",
      validTo: validTo ?? selectedContractRow.term,
      status: selectedContractRow.status,
      services: nextServices,
      serviceItems: nextServiceItems,
      notes: `Ghi chú nội bộ. Điều khoản đặc biệt cho hợp đồng ${selectedContractRow.code}.`
    });
    setContractRateForm(initialContractRateForm);
    setContractRateRows(nextRateRows);
    setIsContractRateFormOpen(false);
    setContractDomesticForm(initialContractDomesticForm);
    setContractDomesticRows(nextDomesticRows);
    setIsContractDomesticFormOpen(false);
    setContractCustomsForm(initialContractCustomsForm);
    setContractCustomsRows([]);
    setIsContractCustomsFormOpen(false);
    setContractWarehouseForm(initialContractWarehouseForm);
    setContractWarehouseRows([]);
    setIsContractWarehouseFormOpen(false);
    setContractDocumentForm(initialContractDocumentForm);
    setContractDocumentRows(
      selectedContractRow.status === "draft"
        ? []
        : [
            {
              fileName: `${selectedContractRow.code}.pdf`,
              documentType: "Contract",
              documentName: selectedContractRow.code,
              documentDate: selectedContractRow.signedAt,
              uploadedBy: currentUserName
            }
          ]
    );
    setIsContractDocumentFormOpen(false);
    setContractCreateWorkspaceTab(nextServices[0] ? (nextServices[0] === "🌍 Vận tải quốc tế"
      ? "services"
      : nextServices[0] === "🚚 Vận tải nội địa"
        ? "domestic"
        : nextServices[0] === "📑 Thủ tục hải quan"
          ? "customs"
          : nextServices[0] === "🏭 Kho bãi & phân phối"
            ? "warehouse"
            : "other") : "documents");
  }, [currentUserName, isContractDetailsPage, selectedContractCode]);

  useEffect(() => {
    if (selectedContractRow?.status === "active") {
      setContractScanFileName(`${selectedContractRow.code}_scan.pdf`);
      setContractScanFileUrl("/demo-contract-scan.html");
      setContractScanUpdatedAt(`09:15 ${selectedContractRow.signedAt}`);
      return;
    }

    setContractScanFileName("");
    setContractScanFileUrl("");
    setContractScanUpdatedAt("");
  }, [selectedContractCode, selectedContractRow]);

  useEffect(() => {
    setCustomerShipmentPage((current) => Math.min(current, customerShipmentPageCount));
  }, [customerShipmentPageCount]);
  useEffect(() => {
    setBookingListPageNumber((current) => Math.min(current, bookingListPageCount));
  }, [bookingListPageCount]);
  useEffect(() => {
    setCustomerListPageNumber((current) => Math.min(current, customerListPageCount));
  }, [customerListPageCount]);
  useEffect(() => {
    setContractListPageNumber((current) => Math.min(current, contractListPageCount));
  }, [contractListPageCount]);
  useEffect(() => {
    setServiceConfigListPageNumber((current) => Math.min(current, serviceConfigListPageCount));
  }, [serviceConfigListPageCount]);

  useEffect(() => {
    setAdvancedFilters((current) => {
      const nextState: AdvancedFilterState = {
        customers: current.customers.filter((value) =>
          filterOptionsByKey.customers.some((option) => option.value === value)
        ),
        originPorts: current.originPorts.filter((value) =>
          filterOptionsByKey.originPorts.some((option) => option.value === value)
        ),
        destinationPorts: current.destinationPorts.filter((value) =>
          filterOptionsByKey.destinationPorts.some((option) => option.value === value)
        ),
        cargoTypes: current.cargoTypes.filter((value) =>
          filterOptionsByKey.cargoTypes.some((option) => option.value === value)
        ),
        packaging: current.packaging.filter((value) =>
          filterOptionsByKey.packaging.some((option) => option.value === value)
        )
      };

      const hasChanged = (Object.keys(nextState) as AdvancedFilterConfig["key"][]).some(
        (key) => nextState[key].length !== current[key].length
      );

      return hasChanged ? nextState : current;
    });
  }, [filterOptionsByKey]);

  useEffect(() => {
    if (!isStatusFilterOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!statusFilterRef.current?.contains(event.target as Node)) {
        setIsStatusFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isStatusFilterOpen, statusFilters]);

  useEffect(() => {
    if (!isCustomerStatusFilterOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerStatusFilterRef.current?.contains(event.target as Node)) {
        setIsCustomerStatusFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomerStatusFilterOpen, customerStatusFilters]);

  useEffect(() => {
    if (!isContractStatusFilterOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractStatusFilterRef.current?.contains(event.target as Node)) {
        setIsContractStatusFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isContractStatusFilterOpen, contractStatusFilters]);

  useEffect(() => {
    if (!isContractExpiryFilterOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractExpiryFilterRef.current?.contains(event.target as Node)) {
        setIsContractExpiryFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isContractExpiryFilterOpen, contractExpiryRange]);

  useEffect(() => {
    if (!isContractExpiryFilterOpen) {
      return;
    }

    setDraftContractExpiryRange(
      contractExpiryRange.from || contractExpiryRange.to ? contractExpiryRange : getCurrentYearDateRange()
    );
  }, [contractExpiryRange, isContractExpiryFilterOpen]);

  useEffect(() => {
    if (!openRowActionCode) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rowActionMenuRef.current?.contains(event.target as Node)) {
        setOpenRowActionCode(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openRowActionCode]);

  useEffect(() => {
    if (!openContractRowActionCode) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractRowActionMenuRef.current?.contains(event.target as Node)) {
        setOpenContractRowActionCode(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openContractRowActionCode]);

  useEffect(() => {
    if (!isDetailsActionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!detailsActionMenuRef.current?.contains(event.target as Node)) {
        setIsDetailsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isDetailsActionMenuOpen]);

  useEffect(() => {
    if (!isCustomerTitleMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerTitleMenuRef.current?.contains(event.target as Node)) {
        setIsCustomerTitleMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomerTitleMenuOpen]);

  useEffect(() => {
    if (!isCustomerBulkActionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerBulkActionMenuRef.current?.contains(event.target as Node)) {
        setIsCustomerBulkActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomerBulkActionMenuOpen]);

  useEffect(() => {
    if (!isGlobalSearchMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!globalSearchMenuRef.current?.contains(event.target as Node)) {
        setIsGlobalSearchMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isGlobalSearchMenuOpen]);

  useEffect(() => {
    if (isCustomerSelectionMode) {
      setIsGlobalSearchMenuOpen(false);
    } else {
      setIsCustomerBulkActionMenuOpen(false);
    }
  }, [isCustomerSelectionMode]);

  useEffect(() => {
    if (contractCreateTabs.length > 0 && !contractCreateTabs.some((tab) => tab.key === contractCreateWorkspaceTab)) {
      setContractCreateWorkspaceTab(contractCreateTabs[0].key);
    }
  }, [contractCreateTabs, contractCreateWorkspaceTab]);

  useEffect(() => {
    if (!openRoutePortMenu) {
      return;
    }

    const activeRef =
      openRoutePortMenu === "origin" ? originPortSearchRef.current : destinationPortSearchRef.current;

    const handlePointerDown = (event: MouseEvent) => {
      if (!activeRef?.contains(event.target as Node)) {
        setOpenRoutePortMenu(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openRoutePortMenu]);

  useEffect(() => {
    if (!isCustomerSearchOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerSearchRef.current?.contains(event.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomerSearchOpen]);

  useEffect(() => {
    if (!isCustomerCreateContractOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerCreateContractRef.current?.contains(event.target as Node)) {
        setIsCustomerCreateContractOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomerCreateContractOpen]);

  useEffect(() => {
    if (!isCustomerAddressFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerAddressInlineFormRef.current?.contains(event.target as Node) && !hasCustomerAddressDraft) {
        setIsCustomerAddressFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasCustomerAddressDraft, isCustomerAddressFormOpen]);

  useEffect(() => {
    if (!isCustomerContactFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerContactInlineFormRef.current?.contains(event.target as Node) && !hasCustomerContactDraft) {
        setIsCustomerContactFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasCustomerContactDraft, isCustomerContactFormOpen]);

  useEffect(() => {
    if (!isServiceDetailFeeFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!serviceDetailFeeInlineFormRef.current?.contains(event.target as Node) && !hasServiceDetailFeeDraft) {
        setIsServiceDetailFeeFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasServiceDetailFeeDraft, isServiceDetailFeeFormOpen]);

  useEffect(() => {
    if (!isCustomerRouteFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerRouteInlineFormRef.current?.contains(event.target as Node) && !hasCustomerRouteDraft) {
        setIsCustomerRouteFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasCustomerRouteDraft, isCustomerRouteFormOpen]);

  useEffect(() => {
    setContractCustomsRows((current) => {
      const manualRows = current.filter((row) => !row.isPreset);
      const presetRows = selectedCustomsServiceItems.map((item) => {
        const existingRow = current.find((row) => row.isPreset && row.serviceName === item);

        if (existingRow) {
          return existingRow;
        }

        return {
          serviceName: item,
          unit: initialContractCustomsForm.unit,
          currency: initialContractCustomsForm.currency,
          rate: "",
          isPreset: true
        };
      });

      return [...presetRows, ...manualRows];
    });
  }, [selectedCustomsServiceItems]);

  useEffect(() => {
    setContractWarehouseRows((current) => {
      const manualRows = current.filter((row) => !row.isPreset);
      const presetRows = selectedWarehouseServiceItems.map((item) => {
        const existingRow = current.find((row) => row.isPreset && row.serviceName === item);

        if (existingRow) {
          return existingRow;
        }

        return {
          serviceName: item,
          unit: initialContractWarehouseForm.unit,
          currency: initialContractWarehouseForm.currency,
          rate: "",
          isPreset: true
        };
      });

      return [...presetRows, ...manualRows];
    });
  }, [selectedWarehouseServiceItems]);

  useEffect(() => {
    if (!isContractRateFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractRateInlineFormRef.current?.contains(event.target as Node) && !hasContractRateDraft) {
        setIsContractRateFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasContractRateDraft, isContractRateFormOpen]);

  useEffect(() => {
    if (!isContractDomesticFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractDomesticInlineFormRef.current?.contains(event.target as Node) && !hasContractDomesticDraft) {
        setIsContractDomesticFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasContractDomesticDraft, isContractDomesticFormOpen]);

  useEffect(() => {
    if (!isContractCustomsFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractCustomsInlineFormRef.current?.contains(event.target as Node) && !hasContractCustomsDraft) {
        setIsContractCustomsFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasContractCustomsDraft, isContractCustomsFormOpen]);

  useEffect(() => {
    if (!isContractDocumentFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractDocumentInlineFormRef.current?.contains(event.target as Node) && !hasContractDocumentDraft) {
        setIsContractDocumentFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasContractDocumentDraft, isContractDocumentFormOpen]);

  useEffect(() => {
    if (!isContractWarehouseFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractWarehouseInlineFormRef.current?.contains(event.target as Node) && !hasContractWarehouseDraft) {
        setIsContractWarehouseFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasContractWarehouseDraft, isContractWarehouseFormOpen]);

  useEffect(() => {
    if (!isContractOtherFormOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!contractOtherInlineFormRef.current?.contains(event.target as Node) && !hasContractOtherDraft) {
        setIsContractOtherFormOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [hasContractOtherDraft, isContractOtherFormOpen]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const visibleCodeSet = new Set(visibleRows.map((row) => row.code));
    setSelectedRowCodes((current) => current.filter((code) => visibleCodeSet.has(code)));
  }, [visibleRows]);

  useEffect(() => {
    const visibleCustomerKeySet = new Set(visibleCustomerRows.map((row) => row.customer));
    setSelectedCustomerRowKeys((current) => current.filter((key) => visibleCustomerKeySet.has(key)));
  }, [visibleCustomerRows]);

  useEffect(() => {
    setRecentCustomerSearches(customerSearchOptions.slice(0, 5).map((option) => option.value));
  }, [customerSearchOptions]);

  useEffect(() => {
    setRecentOriginPortSearches(portSearchOptions.slice(0, 5).map((option) => option.label));
    setRecentDestinationPortSearches(portSearchOptions.slice(0, 5).map((option) => option.label));
  }, [portSearchOptions]);

  const performOpenBookingDetails = (code: string) => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("page");
    nextParams.delete("view");
    nextParams.set("booking", code);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("bookings");
    setSelectedBookingCode(code);
  };

  const openBookingDetails = (code: string) => {
    runWithLeaveGuard(() => performOpenBookingDetails(code));
  };

  const performOpenCreateRequest = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("page");
    nextParams.delete("booking");
    nextParams.set("view", "create");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("bookings");
    setSelectedBookingCode(CREATE_BOOKING_CODE);
  };

  const openCreateRequest = () => {
    runWithLeaveGuard(performOpenCreateRequest);
  };

  const selectCreateCustomer = (customer: string) => {
    const contact = customerContactDirectory[customer];
    setGeneralInfoForm((current) => ({
      ...current,
      customer,
      contactName: contact?.contactName ?? current.contactName,
      email: contact?.email ?? current.email,
      phone: contact?.phone ?? current.phone
    }));
    setRecentCustomerSearches((current) => [customer, ...current.filter((item) => item !== customer)].slice(0, 5));
    setIsCustomerSearchOpen(false);
  };

  const selectRoutePort = (field: "origin" | "destination", label: string) => {
    setRouteScheduleForm((current) => ({
      ...current,
      [field === "origin" ? "originPort" : "destinationPort"]: label
    }));
    if (field === "origin") {
      setRecentOriginPortSearches((current) => [label, ...current.filter((item) => item !== label)].slice(0, 5));
    } else {
      setRecentDestinationPortSearches((current) => [label, ...current.filter((item) => item !== label)].slice(0, 5));
    }
    setOpenRoutePortMenu(null);
  };

  const performShowBookingList = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("page");
    nextParams.delete("booking");
    nextParams.delete("view");
    const queryString = nextParams.toString();
    const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("bookings");
    setSelectedBookingCode(null);
  };

  const showBookingList = () => {
    runWithLeaveGuard(performShowBookingList);
  };

  const performShowCustomerList = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("view");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.set("page", "customers");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("list");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
  };

  const showCustomerList = () => {
    runWithLeaveGuard(performShowCustomerList);
  };

  const performOpenCreateCustomer = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.set("page", "customers");
    nextParams.set("view", "create-customer");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("create");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
    setCustomerCreateForm(initialCustomerCreateForm);
    setCustomerAddressForm(initialCustomerAddressForm);
    setCustomerAddressRows([]);
    setIsCustomerAddressFormOpen(false);
    setCustomerContactForm(initialCustomerContactForm);
    setCustomerContactRows([]);
    setIsCustomerContactFormOpen(false);
    setCustomerRouteForm(initialCustomerRouteForm);
    setCustomerRouteRows([]);
    setIsCustomerRouteFormOpen(false);
    setCustomerInternalNotes("");
    setCustomerCreateWorkspaceTab("address");
    setCustomerCreateErrors({});
    setToast(null);
  };

  const openCreateCustomer = () => {
    runWithLeaveGuard(performOpenCreateCustomer);
  };

  const openCustomerImportModal = () => {
    setCustomerImportFileName("");
    setIsCustomerImportModalOpen(true);
  };

  const openContractImportModal = () => {
    setContractImportFileName("");
    setIsContractImportModalOpen(true);
  };

  const exportCustomerRecords = () => {
    const header = ["Ten khach hang", "Ma so thue", "Nguoi lien he", "Email", "So dien thoai", "Nhom khach hang"];
    const rows = visibleCustomerRows.map((row) => [
      row.customer,
      row.taxId,
      row.contactName,
      row.email,
      row.phone,
      row.customerGroup,
    ]);
    const csvContent = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "customer-records.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setIsCustomerTitleMenuOpen(false);
  };

  const exportContractRecords = () => {
    const header = [
      "So HD",
      "Ten khach hang",
      "Cong ty phu trach",
      "Loai HD",
      "Dich vu",
      "Ngay hieu luc",
      "Ngay het han",
      "Trang thai",
    ];
    const rows = visibleContractRows.map((row) => {
      const [validFrom, validTo] = row.term.split(" - ");
      return [
        row.code,
        row.customer,
        row.contractCompany,
        row.contractType,
        row.services.join(", "),
        validFrom ?? "",
        validTo ?? row.term,
        contractStatusMeta[row.status].label,
      ];
    });
    const csvContent = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "contract-records.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setIsCustomerTitleMenuOpen(false);
  };

  const exportServiceRecords = () => {
    const header = ["Ma loai hinh", "Loai hinh", "So luong phi", "Nguoi tao"];
    const rows = visibleServiceConfigRows.map((row) => [
      row.serviceCode,
      row.item,
      row.feeCount,
      row.createdBy,
    ]);
    const csvContent = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "service-records.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
    setIsCustomerTitleMenuOpen(false);
  };

  const handleCustomerImportFileChange = (file?: File | null) => {
    if (!file) {
      return;
    }

    const isValidFile = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!isValidFile) {
      setCustomerImportFileName("");
      setToast({
        kind: "error",
        message: "File không đúng định dạng. Vui lòng chọn file Excel hoặc CSV."
      });
      return;
    }

    setCustomerImportFileName(file.name);
    setIsCustomerImportModalOpen(false);
    setToast({
      kind: "success",
      message: `Đã tải file ${file.name} để import khách hàng.`
    });
  };

  const handleContractImportFileChange = (file?: File | null) => {
    if (!file) {
      return;
    }

    const isValidFile = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!isValidFile) {
      setContractImportFileName("");
      setToast({
        kind: "error",
        message: "File không đúng định dạng. Vui lòng chọn file Excel hoặc CSV."
      });
      return;
    }

    setContractImportFileName(file.name);
    setIsContractImportModalOpen(false);
    setToast({
      kind: "success",
      message: `Đã tải file ${file.name} để import hợp đồng.`
    });
  };

  const prependCustomsAudit = (tradeType: CustomsTradeType, row: CustomsAuditRow) => {
    setCustomsAuditRowsByType((current) => ({
      ...current,
      [tradeType]: [row, ...current[tradeType]]
    }));
  };

  const updateCustomsCostDraft = (rowId: string, nextAmount: string) => {
    setCustomsCostDrafts((current) => ({
      ...current,
      [rowId]: sanitizeCostAmountInput(nextAmount)
    }));
  };

  const focusCustomsCostAmount = (rowId: string, currentAmount: string) => {
    setCustomsEditingCostRowId(rowId);
    setCustomsCostDrafts((current) => ({
      ...current,
      [rowId]: normalizeCostAmountForEdit(currentAmount)
    }));
  };

  const blurCustomsCostAmount = (rowId: string) => {
    const draftAmount = customsCostDrafts[rowId] ?? "";
    const previousRow = visibleCustomsCostRows.find((row) => row.id === rowId);
    const finalized = finalizeCostAmount(draftAmount);

    if (finalized.error) {
      setToast({ kind: "error", message: finalized.error });
      setCustomsEditingCostRowId(null);
      setCustomsCostDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      return;
    }

    if (!previousRow || previousRow.amount === finalized.value) {
      setCustomsEditingCostRowId(null);
      setCustomsCostDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      return;
    }

    const timestamp = formatAuditTimestamp();
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].map((row) =>
        row.id === rowId
          ? {
              ...row,
              amount: finalized.value,
              updatedBy: finalized.value ? currentUserName : "",
              updatedAt: finalized.value ? timestamp : ""
            }
          : row
      )
    }));
    prependCustomsAudit(customsTradeType, {
      id: `${rowId}-${Date.now()}`,
      action: "Sửa chi phí",
      field: previousRow.feeName,
      beforeValue: buildCostAuditValue(previousRow.amount, previousRow.currency),
      afterValue: buildCostAuditValue(finalized.value, previousRow.currency),
      actor: currentUserName,
      time: timestamp
    });
    setCustomsEditingCostRowId(null);
    setCustomsCostDrafts((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const updateCustomsCostCurrency = (rowId: string, nextCurrency: (typeof COST_CURRENCY_OPTIONS)[number]) => {
    const previousRow = visibleCustomsCostRows.find((row) => row.id === rowId);
    if (!previousRow || previousRow.currency === nextCurrency) {
      return;
    }

    const timestamp = formatAuditTimestamp();
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].map((row) =>
        row.id === rowId
          ? { ...row, currency: nextCurrency, updatedBy: currentUserName, updatedAt: timestamp }
          : row
      )
    }));
    prependCustomsAudit(customsTradeType, {
      id: `${rowId}-currency-${Date.now()}`,
      action: "Sửa chi phí",
      field: previousRow.feeName,
      beforeValue: buildCostAuditValue(previousRow.amount, previousRow.currency),
      afterValue: buildCostAuditValue(previousRow.amount, nextCurrency),
      actor: currentUserName,
      time: timestamp
    });
  };

  const openCustomsUpload = (rowId: string) => {
    setActiveCustomsReplacingFileId(null);
    setActiveCustomsUploadRowId(rowId);
    customsUploadInputRef.current?.click();
  };

  const replaceCustomsDocumentFile = (fileId: string) => {
    if (!activeCustomsDocumentFilesRow) {
      return;
    }
    setActiveCustomsReplacingFileId(fileId);
    setActiveCustomsUploadRowId(activeCustomsDocumentFilesRow.id);
    customsUploadInputRef.current?.click();
  };

  const handleCustomsDocumentUpload = (files?: FileList | null) => {
    if (!activeCustomsUploadRowId || !files?.length) {
      return;
    }

    const uploadedFileNames = Array.from(files).map((file) => file.name);
    const timestamp = formatAuditTimestamp();
    const isCostUpload = activeCustomsUploadRowId.startsWith("cost:");
    const targetRowId = isCostUpload ? activeCustomsUploadRowId.slice(5) : activeCustomsUploadRowId;

    if (isCostUpload) {
      const targetCostRow = visibleCustomsCostRows.find((row) => row.id === targetRowId);

      setCustomsCostRowsByType((current) => ({
        ...current,
        [customsTradeType]: current[customsTradeType].map((row) =>
          row.id === targetRowId
            ? {
                ...row,
                attachmentNames: [...row.attachmentNames, ...uploadedFileNames],
                updatedBy: currentUserName,
                updatedAt: timestamp
              }
            : row
        )
      }));

      if (targetCostRow) {
        prependCustomsAudit(customsTradeType, {
          id: `${targetCostRow.id}-attachment-${Date.now()}`,
          action: "Upload file",
          field: targetCostRow.feeName || "Chi phí",
          beforeValue: `${targetCostRow.attachmentNames.length} file`,
          afterValue: `${targetCostRow.attachmentNames.length + uploadedFileNames.length} file`,
          actor: currentUserName,
          time: timestamp
        });
      }

      setActiveCustomsUploadRowId(null);
      return;
    }

    const targetRow = visibleCustomsDocumentRows.find((row) => row.id === targetRowId);
    if (activeCustomsReplacingFileId && activeCustomsDocumentFilesRow?.id === targetRowId) {
      const targetFileIndex = visibleCustomsGeneratedDocumentFiles.findIndex((file) => file.id === activeCustomsReplacingFileId);
      const currentFileNames = visibleCustomsGeneratedDocumentFiles.map((file) => file.name);
      if (targetFileIndex >= 0) {
        const nextFileNames = [...currentFileNames];
        const replacementFileName = uploadedFileNames[0];
        const previousFileName = nextFileNames[targetFileIndex];
        nextFileNames[targetFileIndex] = replacementFileName;

        setCustomsDocumentRowsByType((current) => ({
          ...current,
          [customsTradeType]: current[customsTradeType].map((row) =>
            row.id === targetRowId
              ? {
                  ...row,
                  fileNames: nextFileNames,
                  updatedBy: currentUserName,
                  updatedAt: timestamp
                }
              : row
          )
        }));

        prependCustomsAudit(customsTradeType, {
          id: `${targetRowId}-replace-${Date.now()}`,
          action: "Thay đổi file",
          field: targetRow?.documentName || "Chứng từ",
          beforeValue: previousFileName,
          afterValue: replacementFileName,
          actor: currentUserName,
          time: timestamp
        });

        setActiveCustomsReplacingFileId(null);
        setActiveCustomsUploadRowId(null);
        return;
      }
    }

    setCustomsDocumentRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].map((row) =>
        row.id === targetRowId
          ? {
              ...row,
              fileNames: [...row.fileNames, ...uploadedFileNames],
              updatedBy: currentUserName,
              updatedAt: timestamp
            }
          : row
      )
    }));

    if (targetRow) {
      prependCustomsAudit(customsTradeType, {
        id: `${targetRow.id}-${Date.now()}`,
        action: "Upload file",
        field: targetRow.documentName,
        beforeValue: `${targetRow.fileNames.length} file`,
        afterValue: `${targetRow.fileNames.length + uploadedFileNames.length} file`,
        actor: currentUserName,
        time: timestamp
      });
    }

    setActiveCustomsReplacingFileId(null);
    setActiveCustomsUploadRowId(null);
  };

  const deleteCustomsGeneratedDocumentFile = (fileId: string) => {
    if (!activeCustomsDocumentFilesRow) {
      return;
    }

    const targetFileIndex = visibleCustomsGeneratedDocumentFiles.findIndex((file) => file.id === fileId);
    if (targetFileIndex < 0) {
      return;
    }

    const timestamp = formatAuditTimestamp();
    const currentFileNames = visibleCustomsGeneratedDocumentFiles.map((file) => file.name);
    const removedFileName = currentFileNames[targetFileIndex];
    const nextFileNames = currentFileNames.filter((_, index) => index !== targetFileIndex);

    setCustomsDocumentRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].map((row) =>
        row.id === activeCustomsDocumentFilesRow.id
          ? {
              ...row,
              fileNames: nextFileNames,
              updatedBy: currentUserName,
              updatedAt: timestamp
            }
          : row
      )
    }));

    prependCustomsAudit(customsTradeType, {
      id: `${activeCustomsDocumentFilesRow.id}-delete-file-${Date.now()}`,
      action: "Xóa file",
      field: activeCustomsDocumentFilesRow.documentName,
      beforeValue: removedFileName,
      afterValue: "",
      actor: currentUserName,
      time: timestamp
    });
  };

  const deleteCustomsDocumentFiles = (rowId: string) => {
    const timestamp = formatAuditTimestamp();
    const targetRow = visibleCustomsDocumentRows.find((row) => row.id === rowId);
    if (!targetRow || targetRow.fileNames.length === 0) {
      return;
    }

    setCustomsDocumentRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].map((row) =>
        row.id === rowId
          ? {
              ...row,
              fileNames: [],
              updatedBy: currentUserName,
              updatedAt: timestamp
            }
          : row
      )
    }));

    prependCustomsAudit(customsTradeType, {
      id: `${rowId}-${Date.now()}`,
      action: "Xóa file",
      field: targetRow.documentName,
      beforeValue: `${targetRow.fileNames.length} file`,
      afterValue: "0 file",
      actor: currentUserName,
      time: timestamp
    });
  };

  const viewCustomsDocumentFiles = (rowId: string) => {
    const targetRow = visibleCustomsDocumentRows.find((row) => row.id === rowId);
    if (!targetRow || targetRow.fileNames.length === 0) {
      if (targetRow?.documentName.startsWith("Các chứng từ khách hàng cung cấp")) {
        setActiveCustomsDocumentFilesRowId(rowId);
        setIsCustomsDocumentFilesModalOpen(true);
      }
      return;
    }

    if (targetRow.documentName === "Debit note") {
      setIsCustomsDebitNotesListOpen(true);
      return;
    }

    if (targetRow.documentName === "Tờ khai hải quan") {
      setIsCustomsDeclarationOpen(true);
      return;
    }

    if (targetRow.documentName === "Đề nghị thanh toán") {
      setIsCustomsPaymentRequestOpen(true);
      return;
    }

    if (targetRow.documentName.startsWith("Các chứng từ khách hàng cung cấp")) {
      setActiveCustomsDocumentFilesRowId(rowId);
      setIsCustomsDocumentFilesModalOpen(true);
      return;
    }

    setToast({
      kind: "success",
      message: `Đang mở ${targetRow.fileNames.length} file của ${targetRow.documentName}.`
    });
  };

  const refreshCustomsTradeType = () => {
    setCustomsEditingCostRowId(null);
    setCustomsCostDrafts({});
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: createInitialCustomsCostRows(customsTradeType)
    }));
    setCustomsDocumentRowsByType((current) => ({
      ...current,
      [customsTradeType]: createInitialCustomsDocumentRows(customsTradeType)
    }));
    setCustomsAuditRowsByType((current) => ({
      ...current,
      [customsTradeType]: createInitialCustomsAuditRows(customsTradeType)
    }));
    setToast({
      kind: "success",
      message: "Đã tải lại dữ liệu Hải quan."
    });
  };

  const saveCustomsDraft = () => {
    prependCustomsAudit(customsTradeType, {
      id: `customs-save-${Date.now()}`,
      action: "Lưu nháp",
      field: customsTradeType === "import" ? "Import" : "Export",
      beforeValue: "-",
      afterValue: "Đã lưu nháp",
      actor: currentUserName,
      time: formatAuditTimestamp()
    });
    setToast({
      kind: "success",
      message: "Đã lưu nháp dữ liệu Hải quan."
    });
  };

  const addCustomsCostRow = () => {
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: [
        ...current[customsTradeType],
        {
          id: `${customsTradeType}-cost-${Date.now()}`,
          feeName: "",
          quantity: "",
          unit: "",
          price: "",
          amount: "",
          currency: "VND",
          vatRate: "",
          vatAmount: "",
          total: "",
          attachmentNames: [],
          isPlaceholder: true,
          updatedBy: "",
          updatedAt: ""
        }
      ]
    }));
  };

  const deleteCustomsCostRow = (rowId: string) => {
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].filter((row) => row.id !== rowId)
    }));
    setCustomsDebitNoteForcedRowIds((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].filter((id) => id !== rowId)
    }));
  };

  const updateCustomsDebitNoteRow = (
    rowId: string,
    field: "feeName" | "quantity" | "unit" | "price" | "vatRate",
    value: string
  ) => {
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        const nextValue =
          field === "price"
            ? formatVietnameseInteger(parseVietnameseNumber(value))
            : field === "vatRate"
              ? normalizeVatRateValue(value)
              : value;

        return recalculateCustomsDebitRow({
          ...row,
          [field]: nextValue
        });
      })
    }));
  };

  const openCustomsDebitNote = () => {
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: "draft"
    }));
    setIsCustomsDebitNotePreviewOpen(true);
  };

  const openCustomsDebitNoteFromList = (status: CustomsDebitNoteListStatus) => {
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: mapDebitListStatusToFlowStatus(status)
    }));
    setIsCustomsDebitNotesListOpen(false);
    setIsCustomsDebitNotePreviewOpen(true);
  };

  const openCustomsDebitNotesList = () => {
    setIsCustomsDebitNotesListOpen(true);
  };

  const openCustomsDeclaration = () => {
    setCustomsDeclarationGoodsItems(createInitialCustomsDeclarationGoods());
    setIsCustomsDeclarationOpen(true);
  };

  const sendCustomsDeclarationForConfirmation = () => {
    setCustomsDeclarationStatusByType((current) => ({
      ...current,
      [customsTradeType]: "pending_confirmation"
    }));
  };

  const moveCustomsDeclarationBackToDraft = () => {
    setCustomsDeclarationStatusByType((current) => ({
      ...current,
      [customsTradeType]: "draft"
    }));
  };

  const confirmCustomsDeclaration = () => {
    setCustomsDeclarationStatusByType((current) => ({
      ...current,
      [customsTradeType]: "pending_payment"
    }));
  };

  const addCustomsDeclarationGoodsItem = () => {
    setCustomsDeclarationGoodsItems((current) => {
      const nextNumber = current.length + 1;
      const nextId = String(nextNumber).padStart(2, "0");
      return [
        ...current,
        {
          id: nextId,
          goodsCode: "",
          description: "",
          managementCode: "",
          quantity1: "",
          quantity2: "",
          invoiceValue: "",
          invoiceUnitPrice: "",
          taxableValue: "",
          taxableUnitPrice: ""
        }
      ];
    });
  };

  const createCustomsDebitNoteFromList = () => {
    if (!canCreateCustomsDebitNote) {
      return;
    }
    setIsCustomsDebitNotesListOpen(false);
    openCustomsDebitNote();
  };

  const sendCustomsDebitNoteForConfirmation = () => {
    if (!customsDebitNoteDueDateByType[customsTradeType].trim()) {
      return;
    }
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: "pending_confirmation"
    }));
  };

  const moveCustomsDebitNoteBackToDraft = () => {
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: "draft"
    }));
  };

  const confirmCustomsDebitNote = () => {
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: "pending_payment"
    }));
  };

  const sendCustomsPaymentRequestForConfirmation = () => {
    if (!customsPaymentRequestDueDateByType[customsTradeType].trim()) {
      return;
    }
    setCustomsPaymentRequestStatusByType((current) => ({
      ...current,
      [customsTradeType]: "pending_confirmation"
    }));
  };

  const confirmCustomsPaymentRequest = () => {
    setCustomsPaymentRequestStatusByType((current) => ({
      ...current,
      [customsTradeType]: "pending_payment"
    }));
  };

  const moveCustomsPaymentRequestBackToDraft = () => {
    setCustomsPaymentRequestStatusByType((current) => ({
      ...current,
      [customsTradeType]: "draft"
    }));
  };

  const markCustomsPaymentRequestPaid = () => {
    setCustomsPaymentRequestStatusByType((current) => ({
      ...current,
      [customsTradeType]: "paid"
    }));
  };

  const markCustomsDebitNotePaid = () => {
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: "paid"
    }));
  };

  const createPaymentRequestFromDebitNote = () => {
    setToast({
      kind: "success",
      message: "Đã tạo Đề nghị thanh toán."
    });
  };

  const cancelCustomsDebitNote = () => {
    setCustomsDebitNoteStatusByType((current) => ({
      ...current,
      [customsTradeType]: "cancelled"
    }));
  };

  const addCustomsDebitNoteRow = () => {
    const nextId = `${customsTradeType}-debit-${Date.now()}`;
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: [
        ...current[customsTradeType],
        {
          id: nextId,
          feeName: "",
          quantity: "",
          unit: "",
          price: "",
          amount: "",
          currency: "VND",
          vatRate: "",
          vatAmount: "",
          total: "",
          updatedBy: "",
          updatedAt: ""
        }
      ]
    }));
    setCustomsDebitNoteForcedRowIds((current) => ({
      ...current,
      [customsTradeType]: [...current[customsTradeType], nextId]
    }));
  };

  const deleteCustomsDebitNoteRow = (rowId: string) => {
    setCustomsCostRowsByType((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].filter((row) => row.id !== rowId)
    }));
    setCustomsDebitNoteForcedRowIds((current) => ({
      ...current,
      [customsTradeType]: current[customsTradeType].filter((id) => id !== rowId)
    }));
  };

  const submitCustomsModule = () => {
    if (isCustomsSubmitDisabled) {
      return;
    }

    prependCustomsAudit(customsTradeType, {
      id: `customs-submit-${Date.now()}`,
      action: "Gửi",
      field: customsTradeType === "import" ? "Import" : "Export",
      beforeValue: "Nháp",
      afterValue: "Đã gửi",
      actor: currentUserName,
      time: formatAuditTimestamp()
    });
    setToast({
      kind: "success",
      message: "Đã gửi dữ liệu Hải quan."
    });
  };

  const prependInlandAudit = (tradeType: CustomsTradeType, row: InlandAuditRow) => {
    setInlandAuditRowsByType((current) => ({
      ...current,
      [tradeType]: [row, ...current[tradeType]]
    }));
  };

  const updateInlandCostDraft = (rowId: string, nextAmount: string) => {
    setInlandCostDrafts((current) => ({
      ...current,
      [rowId]: sanitizeCostAmountInput(nextAmount)
    }));
  };

  const focusInlandCostAmount = (rowId: string, currentAmount: string) => {
    setInlandEditingCostRowId(rowId);
    setInlandCostDrafts((current) => ({
      ...current,
      [rowId]: normalizeCostAmountForEdit(currentAmount)
    }));
  };

  const blurInlandCostAmount = (rowId: string) => {
    const draftAmount = inlandCostDrafts[rowId] ?? "";
    const previousRow = visibleInlandCostRows.find((row) => row.id === rowId);
    const finalized = finalizeCostAmount(draftAmount);

    if (finalized.error) {
      setToast({ kind: "error", message: finalized.error });
      setInlandEditingCostRowId(null);
      setInlandCostDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      return;
    }

    if (!previousRow || previousRow.amount === finalized.value) {
      setInlandEditingCostRowId(null);
      setInlandCostDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      return;
    }

    const timestamp = formatAuditTimestamp();
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].map((row) =>
        row.id === rowId
          ? {
              ...row,
              amount: finalized.value,
              updatedBy: finalized.value ? currentUserName : "",
              updatedAt: finalized.value ? timestamp : ""
            }
          : row
      )
    }));

    prependInlandAudit(inlandTradeType, {
      id: `${rowId}-${Date.now()}`,
      action: "Edit cost",
      target: "COST",
      beforeValue: buildCostAuditValue(previousRow.amount, previousRow.currency),
      afterValue: buildCostAuditValue(finalized.value, previousRow.currency),
      actor: currentUserName,
      time: timestamp
    });
    setInlandEditingCostRowId(null);
    setInlandCostDrafts((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const updateInlandCostCurrency = (rowId: string, nextCurrency: (typeof COST_CURRENCY_OPTIONS)[number]) => {
    const previousRow = visibleInlandCostRows.find((row) => row.id === rowId);
    if (!previousRow || previousRow.currency === nextCurrency) {
      return;
    }

    const timestamp = formatAuditTimestamp();
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].map((row) =>
        row.id === rowId
          ? { ...row, currency: nextCurrency, updatedBy: currentUserName, updatedAt: timestamp }
          : row
      )
    }));

    prependInlandAudit(inlandTradeType, {
      id: `${rowId}-currency-${Date.now()}`,
      action: "Edit cost",
      target: "COST",
      beforeValue: buildCostAuditValue(previousRow.amount, previousRow.currency),
      afterValue: buildCostAuditValue(previousRow.amount, nextCurrency),
      actor: currentUserName,
      time: timestamp
    });
  };

  const addInlandCostRow = () => {
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: [
        ...current[inlandTradeType],
        {
          id: `${inlandTradeType}-inland-cost-${Date.now()}`,
          feeName: "",
          quantity: "",
          unit: "",
          price: "",
          amount: "",
          currency: "VND",
          vatRate: "",
          vatAmount: "",
          total: "",
          attachmentNames: [],
          updatedBy: "",
          updatedAt: ""
        }
      ]
    }));
  };

  const updateInlandDebitNoteRow = (
    rowId: string,
    field: "feeName" | "quantity" | "unit" | "price" | "vatRate",
    value: string
  ) => {
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].map((row) => {
        if (row.id !== rowId) {
          return row;
        }
        const nextValue =
          field === "price"
            ? formatVietnameseInteger(parseVietnameseNumber(value))
            : field === "vatRate"
              ? normalizeVatRateValue(value)
              : value;

        return recalculateCustomsDebitRow({
          ...row,
          [field]: nextValue
        });
      })
    }));
  };

  const openInlandDebitNote = () => {
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "draft"
    }));
    setIsInlandDebitNoteOpen(true);
  };

  const openInlandDebitNoteFromList = (status: CustomsDebitNoteListStatus) => {
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: mapDebitListStatusToFlowStatus(status)
    }));
    setIsInlandDebitNotesListOpen(false);
    setIsInlandDebitNoteOpen(true);
  };

  const openInlandDebitNotesList = () => {
    setIsInlandDebitNotesListOpen(true);
  };

  const createInlandDebitNoteFromList = () => {
    if (!canCreateInlandDebitNote) {
      return;
    }
    setIsInlandDebitNotesListOpen(false);
    openInlandDebitNote();
  };

  const viewInlandDocumentFiles = (rowId: string) => {
    const targetRow = visibleInlandDocumentRows.find((row) => row.id === rowId);
    if (!targetRow) {
      return;
    }

    if (targetRow.documentName === "Debit note") {
      setIsInlandDebitNotesListOpen(true);
      return;
    }

    if (targetRow.documentName === "Đề nghị thanh toán") {
      setIsInlandPaymentRequestOpen(true);
      return;
    }

    downloadInlandDocument(rowId);
  };

  const sendInlandDebitNoteForConfirmation = () => {
    if (!inlandDebitNoteDueDateByType[inlandTradeType].trim()) {
      return;
    }
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "pending_confirmation"
    }));
  };

  const moveInlandDebitNoteBackToDraft = () => {
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "draft"
    }));
  };

  const confirmInlandDebitNote = () => {
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "pending_payment"
    }));
  };

  const sendInlandPaymentRequestForConfirmation = () => {
    if (!inlandPaymentRequestDueDateByType[inlandTradeType].trim()) {
      return;
    }
    setInlandPaymentRequestStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "pending_confirmation"
    }));
  };

  const confirmInlandPaymentRequest = () => {
    setInlandPaymentRequestStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "pending_payment"
    }));
  };

  const moveInlandPaymentRequestBackToDraft = () => {
    setInlandPaymentRequestStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "draft"
    }));
  };

  const markInlandPaymentRequestPaid = () => {
    setInlandPaymentRequestStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "paid"
    }));
  };

  const markInlandDebitNotePaid = () => {
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "paid"
    }));
  };

  const cancelInlandDebitNote = () => {
    setInlandDebitNoteStatusByType((current) => ({
      ...current,
      [inlandTradeType]: "cancelled"
    }));
  };

  const addInlandDebitNoteRow = () => {
    const nextId = `${inlandTradeType}-inland-debit-${Date.now()}`;
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: [
        ...current[inlandTradeType],
        {
          id: nextId,
          feeName: "",
          quantity: "",
          unit: "",
          price: "",
          amount: "",
          currency: "VND",
          vatRate: "",
          vatAmount: "",
          total: "",
          attachmentNames: [],
          updatedBy: "",
          updatedAt: ""
        }
      ]
    }));
    setInlandDebitNoteForcedRowIds((current) => ({
      ...current,
      [inlandTradeType]: [...current[inlandTradeType], nextId]
    }));
  };

  const deleteInlandDebitNoteRow = (rowId: string) => {
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].filter((row) => row.id !== rowId)
    }));
    setInlandDebitNoteForcedRowIds((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].filter((id) => id !== rowId)
    }));
  };

  const openInlandUpload = (rowId: string) => {
    setActiveInlandUploadRowId(rowId);
    inlandUploadInputRef.current?.click();
  };

  const handleInlandDocumentUpload = (files?: FileList | null) => {
    if (!activeInlandUploadRowId || !files?.length) {
      return;
    }

    if (activeInlandUploadRowId.startsWith("cost:")) {
      const costRowId = activeInlandUploadRowId.replace("cost:", "");
      const uploadedFiles = Array.from(files).map((file) => file.name);
      setInlandCostRowsByType((current) => ({
        ...current,
        [inlandTradeType]: current[inlandTradeType].map((row) =>
          row.id === costRowId
            ? {
                ...row,
                attachmentNames: [...row.attachmentNames, ...uploadedFiles]
              }
            : row
        )
      }));
      setActiveInlandUploadRowId(null);
      return;
    }

    const uploadedFiles = Array.from(files).map((file, index) => ({
      id: `${activeInlandUploadRowId}-${Date.now()}-${index}`,
      name: file.name,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`
    }));
    const timestamp = formatAuditTimestamp();
    const targetRow = visibleInlandDocumentRows.find((row) => row.id === activeInlandUploadRowId);

    setInlandDocumentRowsByType((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].map((row) =>
        row.id === activeInlandUploadRowId
          ? {
              ...row,
              files: [...row.files, ...uploadedFiles],
              uploadedBy: currentUserName,
              uploadedAt: timestamp
            }
          : row
      )
    }));

    if (targetRow) {
      prependInlandAudit(inlandTradeType, {
        id: `${targetRow.id}-${Date.now()}`,
        action: "Upload",
        target: "DOCUMENT",
        beforeValue: `${targetRow.files.length} file`,
        afterValue: `${targetRow.files.length + uploadedFiles.length} file`,
        actor: currentUserName,
        time: timestamp
      });
    }

    setActiveInlandUploadRowId(null);
  };

  const downloadInlandDocument = (rowId: string) => {
    const row = visibleInlandDocumentRows.find((item) => item.id === rowId);
    if (!row || row.files.length === 0) {
      return;
    }

    setToast({
      kind: "success",
      message: `Đang tải ${row.files.length} file của ${row.documentName}.`
    });
  };

  const deleteInlandDocumentFiles = (rowId: string) => {
    const timestamp = formatAuditTimestamp();
    const row = visibleInlandDocumentRows.find((item) => item.id === rowId);
    if (!row || row.files.length === 0) {
      return;
    }

    setInlandDocumentRowsByType((current) => ({
      ...current,
      [inlandTradeType]: current[inlandTradeType].map((item) =>
        item.id === rowId
          ? {
              ...item,
              files: [],
              uploadedBy: currentUserName,
              uploadedAt: timestamp
            }
          : item
      )
    }));

    prependInlandAudit(inlandTradeType, {
      id: `${rowId}-${Date.now()}`,
      action: "Delete file",
      target: "DOCUMENT",
      beforeValue: `${row.files.length} file`,
      afterValue: "0 file",
      actor: currentUserName,
      time: timestamp
    });
  };

  const refreshInlandTradeType = () => {
    setInlandEditingCostRowId(null);
    setInlandCostDrafts({});
    setInlandCostRowsByType((current) => ({
      ...current,
      [inlandTradeType]: createInitialInlandCostRows(inlandTradeType)
    }));
    setInlandDocumentRowsByType((current) => ({
      ...current,
      [inlandTradeType]: createInitialInlandDocumentRows(inlandTradeType)
    }));
    setInlandAuditRowsByType((current) => ({
      ...current,
      [inlandTradeType]: createInitialInlandAuditRows(inlandTradeType)
    }));
    setToast({
      kind: "success",
      message: "Đã tải lại dữ liệu Vận tải nội địa."
    });
  };

  const saveInlandDraft = () => {
    prependInlandAudit(inlandTradeType, {
      id: `inland-save-${Date.now()}`,
      action: "Save draft",
      target: "DOCUMENT",
      beforeValue: "-",
      afterValue: "Đã lưu nháp",
      actor: currentUserName,
      time: formatAuditTimestamp()
    });
    setToast({
      kind: "success",
      message: "Đã lưu nháp dữ liệu Vận tải nội địa."
    });
  };

  const submitInlandModule = () => {
    if (isInlandSubmitDisabled) {
      return;
    }

    prependInlandAudit(inlandTradeType, {
      id: `inland-submit-${Date.now()}`,
      action: "Submit",
      target: "DOCUMENT",
      beforeValue: "Nháp",
      afterValue: "Đã gửi",
      actor: currentUserName,
      time: formatAuditTimestamp()
    });
    setToast({
      kind: "success",
      message: "Đã gửi dữ liệu Vận tải nội địa."
    });
  };

  const prependOverseaAudit = (tradeType: CustomsTradeType, row: OverseaAuditRow) => {
    setOverseaAuditRowsByType((current) => ({
      ...current,
      [tradeType]: [row, ...current[tradeType]]
    }));
  };

  const updateOverseaCostDraft = (rowId: string, nextAmount: string) => {
    setOverseaCostDrafts((current) => ({
      ...current,
      [rowId]: sanitizeCostAmountInput(nextAmount)
    }));
  };

  const focusOverseaCostAmount = (rowId: string, currentAmount: string) => {
    setOverseaEditingCostRowId(rowId);
    setOverseaCostDrafts((current) => ({
      ...current,
      [rowId]: normalizeCostAmountForEdit(currentAmount)
    }));
  };

  const blurOverseaCostAmount = (rowId: string) => {
    const draftAmount = overseaCostDrafts[rowId] ?? "";
    const previousRow = visibleOverseaCostRows.find((row) => row.id === rowId);
    const finalized = finalizeCostAmount(draftAmount);

    if (finalized.error) {
      setToast({ kind: "error", message: finalized.error });
      setOverseaEditingCostRowId(null);
      setOverseaCostDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      return;
    }

    if (!previousRow || previousRow.amount === finalized.value) {
      setOverseaEditingCostRowId(null);
      setOverseaCostDrafts((current) => {
        const next = { ...current };
        delete next[rowId];
        return next;
      });
      return;
    }

    const timestamp = formatAuditTimestamp();
    setOverseaCostRowsByType((current) => ({
      ...current,
      [overseaTradeType]: current[overseaTradeType].map((row) =>
        row.id === rowId
          ? {
              ...row,
              amount: finalized.value,
              updatedBy: finalized.value ? currentUserName : "",
              updatedAt: finalized.value ? timestamp : ""
            }
          : row
      )
    }));

    prependOverseaAudit(overseaTradeType, {
      id: `${rowId}-${Date.now()}`,
      action: "Sửa chi phí",
      field: previousRow.feeName,
      beforeValue: buildCostAuditValue(previousRow.amount, previousRow.currency),
      afterValue: buildCostAuditValue(finalized.value, previousRow.currency),
      actor: currentUserName,
      time: timestamp
    });
    setOverseaEditingCostRowId(null);
    setOverseaCostDrafts((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });
  };

  const updateOverseaCostCurrency = (rowId: string, nextCurrency: (typeof COST_CURRENCY_OPTIONS)[number]) => {
    const previousRow = visibleOverseaCostRows.find((row) => row.id === rowId);
    if (!previousRow || previousRow.currency === nextCurrency) {
      return;
    }

    const timestamp = formatAuditTimestamp();
    setOverseaCostRowsByType((current) => ({
      ...current,
      [overseaTradeType]: current[overseaTradeType].map((row) =>
        row.id === rowId
          ? { ...row, currency: nextCurrency, updatedBy: currentUserName, updatedAt: timestamp }
          : row
      )
    }));

    prependOverseaAudit(overseaTradeType, {
      id: `${rowId}-currency-${Date.now()}`,
      action: "Sửa chi phí",
      field: previousRow.feeName,
      beforeValue: buildCostAuditValue(previousRow.amount, previousRow.currency),
      afterValue: buildCostAuditValue(previousRow.amount, nextCurrency),
      actor: currentUserName,
      time: timestamp
    });
  };

  const refreshOverseaTradeType = () => {
    setOverseaEditingCostRowId(null);
    setOverseaCostDrafts({});
    setOverseaCostRowsByType((current) => ({
      ...current,
      [overseaTradeType]: createInitialOverseaCostRows(overseaTradeType)
    }));
    setOverseaDocumentRowsByType((current) => ({
      ...current,
      [overseaTradeType]: createInitialOverseaDocumentRows(overseaTradeType)
    }));
    setOverseaAuditRowsByType((current) => ({
      ...current,
      [overseaTradeType]: createInitialOverseaAuditRows(overseaTradeType)
    }));
    setToast({
      kind: "success",
      message: "Đã tải lại dữ liệu Vận tải quốc tế."
    });
  };

  const saveOverseaDraft = () => {
    prependOverseaAudit(overseaTradeType, {
      id: `oversea-save-${Date.now()}`,
      action: "Lưu nháp",
      field: overseaTradeType === "import" ? "Import" : "Export",
      beforeValue: "-",
      afterValue: "Đã lưu nháp",
      actor: currentUserName,
      time: formatAuditTimestamp()
    });
    setToast({
      kind: "success",
      message: "Đã lưu nháp dữ liệu Vận tải quốc tế."
    });
  };

  const submitOverseaModule = () => {
    prependOverseaAudit(overseaTradeType, {
      id: `oversea-submit-${Date.now()}`,
      action: "Gửi",
      field: overseaTradeType === "import" ? "Import" : "Export",
      beforeValue: "Nháp",
      afterValue: "Đã gửi",
      actor: currentUserName,
      time: formatAuditTimestamp()
    });
    setToast({
      kind: "success",
      message: "Đã gửi dữ liệu Vận tải quốc tế."
    });
  };

  const scrollToAuditSection = (section: HTMLDivElement | null) => {
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCustomsAuditSection = () => {
    setIsCustomsAuditLogOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToAuditSection(customsAuditSectionRef.current));
    });
  };

  const openInlandAuditSection = () => {
    setIsInlandAuditLogOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToAuditSection(inlandAuditSectionRef.current));
    });
  };

  const openOverseaAuditSection = () => {
    setIsOverseaAuditLogOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToAuditSection(overseaAuditSectionRef.current));
    });
  };

  const openShipmentDetailAuditSection = () => {
    setIsShipmentDetailAuditLogOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToAuditSection(shipmentDetailAuditSectionRef.current));
    });
  };

  const handleShipmentDetailAttachmentUpload = (files?: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setShipmentDetailAttachments((current) => [
      ...current,
      ...Array.from(files).map((file, index) => ({
        id: `shipment-detail-attachment-${Date.now()}-${index}`,
        name: file.name,
        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`
      }))
    ]);
  };

  const updateShipmentDetailChargeRow = (
    groupName: string,
    rowIndex: number,
    field:
      | "code"
      | "name"
      | "location"
      | "unit"
      | "currency"
      | "price"
      | "containerType"
      | "quantity",
    value: string
  ) => {
    setShipmentDetailChargeGroups((current) =>
      current.map((group) =>
        group.group === groupName
          ? {
              ...group,
              rows: group.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex ? { ...row, [field]: value } : row
              )
            }
          : group
      )
    );
  };

  const addShipmentDetailChargeRow = (groupName: string) => {
    setShipmentDetailChargeGroups((current) =>
      current.map((group) =>
        group.group === groupName
          ? {
              ...group,
              rows: [
                ...group.rows,
                {
                  code: "",
                  name: "",
                  location: "",
                  unit: "",
                  currency: "USD",
                  price: "",
                  containerType: "",
                  quantity: "",
                  total: ""
                }
              ]
            }
          : group
      )
    );
  };

  const updateShipmentDetailLclChargeRow = (
    groupName: string,
    rowIndex: number,
    field:
      | "code"
      | "name"
      | "location"
      | "unit"
      | "currency"
      | "price"
      | "minCharge"
      | "cbm"
      | "ton"
      | "wm",
    value: string
  ) => {
    setShipmentDetailLclChargeGroups((current) =>
      current.map((group) =>
        group.group === groupName
          ? {
              ...group,
              rows: group.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex ? { ...row, [field]: value } : row
              )
            }
          : group
      )
    );
  };

  const addShipmentDetailLclChargeRow = (groupName: string) => {
    setShipmentDetailLclChargeGroups((current) =>
      current.map((group) =>
        group.group === groupName
          ? {
              ...group,
              rows: [
                ...group.rows,
                {
                  code: "",
                  name: "",
                  location: "",
                  unit: "",
                  currency: "USD",
                  price: "",
                  minCharge: "",
                  cbm: "0.00",
                  ton: "0.000",
                  wm: "auto"
                }
              ]
            }
          : group
      )
    );
  };

  const openOverseaUpload = (rowId: string) => {
    setActiveOverseaUploadRowId(rowId);
    setIsOverseaUploadingRowId(rowId);
    overseaUploadInputRef.current?.click();
  };

  const handleOverseaDocumentUpload = (files?: FileList | null) => {
    if (!activeOverseaUploadRowId) {
      setIsOverseaUploadingRowId(null);
      return;
    }

    if (!files?.length) {
      setActiveOverseaUploadRowId(null);
      setIsOverseaUploadingRowId(null);
      return;
    }

    const timestamp = formatAuditTimestamp();
    const uploadedFiles: OverseaDocumentFile[] = Array.from(files).map((file, index) => ({
      id: `${activeOverseaUploadRowId}-${Date.now()}-${index}`,
      name: file.name,
      sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadedBy: currentUserName,
      uploadedAt: timestamp
    }));
    const targetRow = visibleOverseaDocumentRows.find((row) => row.id === activeOverseaUploadRowId);

    setOverseaDocumentRowsByType((current) => ({
      ...current,
      [overseaTradeType]: current[overseaTradeType].map((row) =>
        row.id === activeOverseaUploadRowId
          ? {
              ...row,
              files: [...row.files, ...uploadedFiles],
              updatedBy: currentUserName,
              updatedAt: timestamp
            }
          : row
      )
    }));

    if (targetRow) {
      prependOverseaAudit(overseaTradeType, {
        id: `${targetRow.id}-${Date.now()}`,
        action: "Upload file",
        field: targetRow.documentName,
        beforeValue: `${targetRow.files.length} file`,
        afterValue: `${targetRow.files.length + uploadedFiles.length} file`,
        actor: currentUserName,
        time: timestamp
      });
    }

    setActiveOverseaUploadRowId(null);
    setIsOverseaUploadingRowId(null);
  };

  const downloadOverseaDocument = (rowId: string, fileId?: string) => {
    const row = visibleOverseaDocumentRows.find((item) => item.id === rowId);
    if (!row || row.files.length === 0) {
      return;
    }

    const file = fileId ? row.files.find((item) => item.id === fileId) : null;
    setToast({
      kind: "success",
      message: file ? `Đang tải file ${file.name}.` : `Đang tải ${row.files.length} file của ${row.documentName}.`
    });
  };

  const deleteOverseaDocumentFile = (rowId: string, fileId?: string) => {
    const row = visibleOverseaDocumentRows.find((item) => item.id === rowId);
    if (!row || row.files.length === 0) {
      return;
    }

    const timestamp = formatAuditTimestamp();
    const remainingFiles = fileId ? row.files.filter((file) => file.id !== fileId) : [];

    setOverseaDocumentRowsByType((current) => ({
      ...current,
      [overseaTradeType]: current[overseaTradeType].map((item) =>
        item.id === rowId
          ? {
              ...item,
              files: remainingFiles,
              updatedBy: currentUserName,
              updatedAt: timestamp
            }
          : item
      )
    }));

    prependOverseaAudit(overseaTradeType, {
      id: `${rowId}-${Date.now()}`,
      action: "Delete file",
      field: row.documentName,
      beforeValue: `${row.files.length} file`,
      afterValue: `${remainingFiles.length} file`,
      actor: currentUserName,
      time: timestamp
    });
  };

  const sampleCustomerImportTemplate = [
    ["ten_khach_hang", "ma_so_thue", "cong_ty_ky_hop_dong", "nguoi_lien_he", "email", "so_dien_thoai"],
    ["Cong ty TNHH ABC Logistics", "0312345678", "PI Log", "Nguyen Van A", "contact@abclogistics.vn", "0901234567"],
    ["Cong ty CP Minh Phat", "0309988776", "TDB", "Tran Thi B", "ops@minhphat.vn", "0912345678"]
  ];
  const sampleCustomerImportTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    sampleCustomerImportTemplate.map((row) => row.join(",")).join("\n")
  )}`;

  const updateCustomerCreateForm = <K extends keyof CustomerCreateFormState>(
    key: K,
    value: CustomerCreateFormState[K]
  ) => {
    setCustomerCreateForm((current) => {
      if (key === "customerName") {
        return {
          ...current,
          customerName: value as CustomerCreateFormState["customerName"],
          englishName: buildEnglishCustomerName(value as CustomerCreateFormState["customerName"])
        };
      }

      return { ...current, [key]: value };
    });
    setCustomerCreateErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const toggleCustomerCreateMultiValue = (
    key: "services" | "responsibleCompanies" | "tags",
    value: string
  ) => {
    setCustomerCreateForm((current) => {
      const currentValues = current[key];
      const nextValues =
        key === "responsibleCompanies"
          ? currentValues.includes(value)
            ? []
            : [value]
          : currentValues.includes(value)
            ? currentValues.filter((item) => item !== value)
            : [...currentValues, value];
      return { ...current, [key]: nextValues };
    });
    setCustomerCreateErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const validateCustomerCreateForm = () => {
    const nextErrors: CustomerCreateFormErrors = {};
    const normalizedCustomerName = customerCreateForm.customerName.trim();
    const isDuplicateCustomerName = customerRows.some((row) =>
      row.customer === normalizedCustomerName &&
      (!isCustomerDetailsPage || row.customer !== selectedCustomerRow?.customer)
    );

    if (!normalizedCustomerName) {
      nextErrors.customerName = "Vui lòng nhập tên pháp lý (VN).";
    } else if (isDuplicateCustomerName) {
      nextErrors.customerName = "Tên pháp lý đã tồn tại trong hệ thống.";
    }

    if (customerCreateForm.taxId.trim() && !/^\d{10}(\d{3})?$/.test(customerCreateForm.taxId)) {
      nextErrors.taxId = "MST phải gồm 10 hoặc 13 chữ số.";
    }

    if (!customerCreateForm.customerType) {
      nextErrors.customerType = "Vui lòng chọn loại KH.";
    }

    if (customerCreateForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerCreateForm.email)) {
      nextErrors.email = "Email không đúng định dạng.";
    }

    if (customerCreateForm.phone.trim() && !/^(?:\+84|0)\d{9,10}$/.test(customerCreateForm.phone)) {
      nextErrors.phone = "SĐT phải có dạng +84xxxxxxxxx hoặc 0xxxxxxxxx.";
    }

    if (customerCreateForm.website.trim() && !/^https?:\/\/.+\..+/i.test(customerCreateForm.website)) {
      nextErrors.website = "Website phải có dạng URL hợp lệ.";
    }

    if (customerCreateForm.responsibleCompanies.length === 0) {
      nextErrors.responsibleCompanies = "Vui lòng chọn ít nhất một công ty phụ trách.";
    }

    return nextErrors;
  };

  const handleSaveCustomer = () => {
    const nextErrors = validateCustomerCreateForm();
    setCustomerCreateErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setToast(null);
      return;
    }

    setToast({
      kind: "success",
      message: isCustomerDetailsPage ? "Cập nhật khách hàng thành công." : "Tạo mới khách hàng thành công."
    });
  };

  const validateContractCreateForm = () => {
    const nextErrors: ContractCreateFormErrors = {};

    if (!contractCreateForm.customer) {
      nextErrors.customer = "Vui lòng chọn khách hàng.";
    }

    if (!contractCreateForm.contractType) {
      nextErrors.contractType = "Vui lòng chọn loại hợp đồng.";
    }

    if (!contractCreateForm.validFrom) {
      nextErrors.validFrom = "Vui lòng chọn ngày hiệu lực.";
    }

    if (!contractCreateForm.validTo) {
      nextErrors.validTo = "Vui lòng chọn ngày hết hạn.";
    }

    return nextErrors;
  };

  const handleSaveCustomerDraft = () => {
    setCustomerCreateErrors({});
    setToast({
      kind: "success",
      message: "Đã lưu nháp khách hàng."
    });
  };

  const handleSaveContract = () => {
    const nextErrors = validateContractCreateForm();
    setContractCreateErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setToast(null);
      return;
    }

    setToast({
      kind: "success",
      message: isContractDetailsPage ? "Cập nhật hợp đồng thành công." : "Tạo mới hợp đồng thành công."
    });
  };

  const submitContractForApproval = () => {
    if (!isContractDetailsPage || !selectedContractRow) {
      return;
    }

    setContractStatusOverrides((current) => ({
      ...current,
      [selectedContractRow.code]: "pending"
    }));
    setContractCreateForm((current) => ({ ...current, status: "pending" }));
    setToast({
      kind: "success",
      message: "Đã gửi hợp đồng chờ duyệt."
    });
  };

  const approveContractFromDetails = () => {
    if (!isContractDetailsPage || !selectedContractRow) {
      return;
    }

    setContractStatusOverrides((current) => ({
      ...current,
      [selectedContractRow.code]: "active"
    }));
    setContractCreateForm((current) => ({ ...current, status: "active" }));
    setToast({
      kind: "success",
      message: "Đã phê duyệt hợp đồng."
    });
  };

  const rejectContractFromDetails = () => {
    if (!isContractDetailsPage || !selectedContractRow) {
      return;
    }

    setContractStatusOverrides((current) => ({
      ...current,
      [selectedContractRow.code]: "draft"
    }));
    setContractCreateForm((current) => ({ ...current, status: "draft" }));
    setToast({
      kind: "success",
      message: "Đã từ chối hợp đồng và chuyển về nháp."
    });
  };

  const cancelApprovedContractFromDetails = () => {
    if (!isContractDetailsPage || !selectedContractRow) {
      return;
    }

    setContractStatusOverrides((current) => ({
      ...current,
      [selectedContractRow.code]: "terminated"
    }));
    setContractCreateForm((current) => ({ ...current, status: "terminated" }));
    setToast({
      kind: "success",
      message: "Đã hủy hợp đồng."
    });
  };

  const deleteContractFromDetails = () => {
    if (!selectedContractRow) {
      return;
    }

    setIsDetailsActionMenuOpen(false);
    setDeletedContractCodes((current) =>
      current.includes(selectedContractRow.code) ? current : [...current, selectedContractRow.code]
    );
    performShowCustomerContracts();
    setToast({
      kind: "success",
      message: "Đã xóa hợp đồng."
    });
  };

  const duplicateContractFromDetails = () => {
    if (!selectedContractRow) {
      return;
    }

    const nextCode = `${(selectedContractRow.contractCompany.split(" / ")[0] ?? "PIL")}-CNT-2025-${String(
      contractRows.length + 1
    ).padStart(3, "0")}`;

    setIsDetailsActionMenuOpen(false);
    performOpenCreateContract();
    setContractCreateForm({
      ...contractCreateForm,
      code: nextCode,
      status: "draft",
      signedAt: ""
    });
    setContractRateRows(contractRateRows.map((row) => ({ ...row })));
    setContractDomesticRows(contractDomesticRows.map((row) => ({ ...row })));
    setContractCustomsRows(contractCustomsRows.map((row) => ({ ...row })));
    setContractWarehouseRows(contractWarehouseRows.map((row) => ({ ...row })));
    setContractDocumentRows(contractDocumentRows.map((row) => ({ ...row })));
    setToast({
      kind: "success",
      message: "Đã tạo bản sao hợp đồng."
    });
  };

  const toggleContractTerminationFromDetails = () => {
    if (!selectedContractRow) {
      return;
    }

    const nextStatus: ContractRow["status"] =
      selectedContractRow.status === "terminated" ? "active" : "terminated";

    setIsDetailsActionMenuOpen(false);
    setContractStatusOverrides((current) => ({
      ...current,
      [selectedContractRow.code]: nextStatus
    }));
    setContractCreateForm((current) => ({ ...current, status: nextStatus }));
    setToast({
      kind: "success",
      message: nextStatus === "terminated" ? "Đã chấm dứt hợp đồng." : "Đã kích hoạt lại hợp đồng."
    });
  };

  const deleteCustomerFromDetails = () => {
    if (!selectedCustomerRow) {
      return;
    }

    setIsCustomerTitleMenuOpen(false);
    setDeletedCustomerKeys((current) =>
      current.includes(selectedCustomerRow.customer) ? current : [...current, selectedCustomerRow.customer]
    );
    performShowCustomerList();
    setToast({
      kind: "success",
      message: "Đã xóa khách hàng."
    });
  };

  const duplicateCustomerFromDetails = () => {
    if (!selectedCustomerRow) {
      return;
    }

    const duplicatedNameBase = customerCreateForm.customerName.trim() || selectedCustomerRow.customer;

    setIsCustomerTitleMenuOpen(false);
    performOpenCreateCustomer();
    setCustomerCreateForm({
      ...customerCreateForm,
      customerName: `${duplicatedNameBase} (Bản sao)`,
      status: "draft",
      contractCode: ""
    });
    setCustomerAddressRows(customerAddressRows.map((row) => ({ ...row })));
    setCustomerContactRows(customerContactRows.map((row) => ({ ...row })));
    setCustomerRouteRows(customerRouteRows.map((row) => ({ ...row })));
    setCustomerInternalNotes(customerInternalNotes);
    setToast({
      kind: "success",
      message: "Đã tạo bản sao khách hàng."
    });
  };

  const toggleCustomerLockFromDetails = () => {
    if (!selectedCustomerRow) {
      return;
    }

    const nextStatus: CustomerAccountStatus = selectedCustomerRow.status === "locked" ? "active" : "locked";

    setIsCustomerTitleMenuOpen(false);
    setCustomerStatusOverrides((current) => ({
      ...current,
      [selectedCustomerRow.customer]: nextStatus
    }));
    setToast({
      kind: "success",
      message: nextStatus === "locked" ? "Đã khóa khách hàng." : "Đã mở khóa khách hàng."
    });
  };

  const performShowCustomerContracts = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.set("page", "customers");
    nextParams.set("view", "contracts");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("contracts");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
  };

  const showCustomerContracts = () => {
    runWithLeaveGuard(performShowCustomerContracts);
  };

  const performOpenCreateContract = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.set("page", "customers");
    nextParams.set("view", "create-contract");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("create-contract");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
    setContractCreateErrors({});
    setContractCreateForm(initialContractCreateForm);
    setContractRateForm(initialContractRateForm);
    setContractRateRows([]);
    setIsContractRateFormOpen(false);
    setContractDomesticForm(initialContractDomesticForm);
    setContractDomesticRows([]);
    setIsContractDomesticFormOpen(false);
    setContractCustomsForm(initialContractCustomsForm);
    setContractCustomsRows([]);
    setIsContractCustomsFormOpen(false);
    setContractWarehouseForm(initialContractWarehouseForm);
    setContractWarehouseRows([]);
    setIsContractWarehouseFormOpen(false);
    setContractDocumentForm(initialContractDocumentForm);
    setContractDocumentRows([]);
    setIsContractDocumentFormOpen(false);
    setContractCreateWorkspaceTab("documents");
  };

  const openCreateContract = () => {
    runWithLeaveGuard(performOpenCreateContract);
  };

  const goBackFromCreatePage = () => {
    if (isCustomerContractCreatePage || isContractDetailsPage) {
      showCustomerContracts();
      return;
    }

    if (isServiceDetailsPage) {
      showCustomerServices();
      return;
    }

    if (isCustomerCreateLikePage) {
      showCustomerList();
    }
  };

  const performShowCustomerServices = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.delete("service");
    nextParams.delete("service_item");
    nextParams.set("page", "customers");
    nextParams.set("view", "services");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("services");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
    setSelectedServiceDetailKey(null);
  };

  const showCustomerServices = () => {
    runWithLeaveGuard(performShowCustomerServices);
  };

  const performShowCustomerShipments = (tab: "list" | "details" | "customs" | "inland" | "oversea" = "list") => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.delete("service");
    nextParams.delete("service_item");
    nextParams.delete("shipment");
    nextParams.set("page", "customers");
    nextParams.set("view", "shipments");
    nextParams.set("shipment_tab", tab);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("shipments");
    setShipmentWorkspaceTab(tab);
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
    setSelectedServiceDetailKey(null);
    setSelectedShipmentCode(null);
  };

  const showCustomerShipments = (tab: "list" | "details" | "customs" | "inland" | "oversea" = "list") => {
    runWithLeaveGuard(() => performShowCustomerShipments(tab));
  };

  const performOpenShipmentWorkspace = (
    shipmentCode: string,
    tab: "details" | "customs" | "inland" | "oversea" = "details"
  ) => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.delete("service");
    nextParams.delete("service_item");
    nextParams.set("page", "customers");
    nextParams.set("view", "shipments");
    nextParams.set("shipment_tab", tab);
    nextParams.set("shipment", shipmentCode);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("shipments");
    setShipmentWorkspaceTab(tab);
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
    setSelectedServiceDetailKey(null);
    setSelectedShipmentCode(shipmentCode);
    const selectedRow = allBookingRows.find((row) => row.code === shipmentCode);
    if (selectedRow) {
      setShipmentDetailNumber(formatShipmentCodeFromBooking(selectedRow.code));
      setShipmentDetailCustomerName(selectedRow.customer);
      setShipmentDetailCommodity(selectedRow.packaging.toUpperCase());
    }
  };

  const openShipmentWorkspace = (
    shipmentCode: string,
    tab: "details" | "customs" | "inland" | "oversea" = "details"
  ) => {
    runWithLeaveGuard(() => performOpenShipmentWorkspace(shipmentCode, tab));
  };

  const performShowCustomerCustoms = () => {
    performShowCustomerShipments("customs");
  };

  const showCustomerCustoms = () => {
    runWithLeaveGuard(performShowCustomerCustoms);
  };

  const performShowCustomerInland = () => {
    performShowCustomerShipments("inland");
  };

  const showCustomerInland = () => {
    runWithLeaveGuard(performShowCustomerInland);
  };

  const performShowCustomerOversea = () => {
    performShowCustomerShipments("oversea");
  };

  const showCustomerOversea = () => {
    runWithLeaveGuard(performShowCustomerOversea);
  };

  const performOpenServiceDetails = (service: ServicePageScope, item: string) => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.delete("contract");
    nextParams.set("page", "customers");
    nextParams.set("view", "services");
    nextParams.set("service", service);
    nextParams.set("service_item", item);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("services");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
    setSelectedServiceScope(service);
    setSelectedServiceDetailKey(`${service}__${item}`);
  };

  const openServiceDetails = (service: ServicePageScope, item: string) => {
    runWithLeaveGuard(() => performOpenServiceDetails(service, item));
  };

  const performOpenCustomerDetails = (customer: string) => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("view");
    nextParams.delete("contract");
    nextParams.set("page", "customers");
    nextParams.set("customer", customer);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("list");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(customer);
    setSelectedContractCode(null);
  };

  const openCustomerDetails = (customer: string) => {
    runWithLeaveGuard(() => performOpenCustomerDetails(customer));
  };

  const performOpenContractDetails = (code: string) => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("booking");
    nextParams.delete("customer");
    nextParams.set("page", "customers");
    nextParams.set("view", "contracts");
    nextParams.set("contract", code);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("contracts");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(code);
  };

  const openContractDetails = (code: string) => {
    runWithLeaveGuard(() => performOpenContractDetails(code));
  };

  const updateAdvancedFilter = (key: AdvancedFilterConfig["key"], values: string[]) => {
    setAdvancedFilters((current) => ({ ...current, [key]: values }));
  };

  const clearAllAdvancedFilters = () => {
    setAdvancedFilters(initialAdvancedFilterState);
  };

  const updateCustomerListFilter = (key: CustomerListFilterKey, values: string[]) => {
    setCustomerListFilters((current) => ({ ...current, [key]: values }));
  };

  const clearAllCustomerListFilters = () => {
    setCustomerListFilters(initialCustomerListFilterState);
    setContractExpiryRange({ from: "", to: "" });
  };

  const toggleStatusFilterValue = (status: BookingStatus) => {
    setStatusFilters((current) => (current[0] === status ? [] : [status]));
    setIsStatusFilterOpen(false);
  };

  const selectAllStatuses = () => {
    setStatusFilters([]);
    setIsStatusFilterOpen(false);
  };

  const openStatusFilter = () => {
    setIsStatusFilterOpen(true);
  };

  const toggleCustomerStatusFilterValue = (status: CustomerAccountStatus) => {
    setCustomerStatusFilters((current) => (current[0] === status ? [] : [status]));
    setIsCustomerStatusFilterOpen(false);
  };

  const selectAllCustomerStatuses = () => {
    setCustomerStatusFilters([]);
    setIsCustomerStatusFilterOpen(false);
  };

  const openCustomerStatusFilter = () => {
    setIsCustomerStatusFilterOpen(true);
  };

  const toggleContractStatusFilterValue = (status: ContractRow["status"]) => {
    setContractStatusFilters((current) => (current[0] === status ? [] : [status]));
    setIsContractStatusFilterOpen(false);
  };

  const selectAllContractStatuses = () => {
    setContractStatusFilters([]);
    setIsContractStatusFilterOpen(false);
  };

  const openContractStatusFilter = () => {
    setIsContractStatusFilterOpen(true);
  };

  const handleOriginPortsApplied = (values: string[]) => {
    if (values.length > 0) {
      setDestinationOpenSignal((current) => current + 1);
    }
  };

  const totalSelectedFilters = Object.values(advancedFilters).reduce(
    (total, values) => total + values.length,
    0
  );
  const totalSelectedCustomerListFilters = Object.values(customerListFilters).reduce(
    (total, values) => total + values.length,
    0
  ) + (contractExpiryRange.from ? 1 : 0) + (contractExpiryRange.to ? 1 : 0);
  const selectedBookingNumber = selectedBookingRow ? Number(selectedBookingRow.code.replace(/\D/g, "")) : 0;
  const isCanceledBooking = selectedBookingRow?.status === "canceled";
  const isConfirmedBooking = selectedBookingRow?.status === "confirmed";
  const isDetailsReadOnly = isCanceledBooking || isConfirmedBooking;
  const selectedBookingQuoteCode = `SQ-2026-${String((selectedBookingNumber % 9000) + 1).padStart(4, "0")}`;
  const selectedBookingContactName = "Trần Minh Tuấn";
  const selectedBookingContactEmail = "tuan.tran@phuongnam.vn";
  const selectedBookingContactPhone = "+84 28 3825 6789";
  const selectedCarrier = [
    "Maersk (Maersk Line)",
    "MSC (Mediterranean Shipping Company)",
    "CNC (Cheng Lie Navigation)",
    "ONE (Ocean Network Express)",
    "Evergreen (Evergreen Line)"
  ][selectedBookingNumber % 5];
  const selectedCancelReason =
    "Khách hàng thay đổi kế hoạch xuất hàng và yêu cầu hủy booking trước khi hãng tàu xác nhận.";
  const selectedAcceptedMessage = "Yêu cầu booking đã được hãng tàu xác nhận và đang chờ triển khai tiếp theo.";
  const selectedLocationType = selectedBookingNumber % 2 === 0 ? "Door" : "Ramp";
  const selectedVessel = [
    "MSC Aurora / 026W",
    "Maersk Sentosa / 118S",
    "CNC Diamond / 092N",
    "ONE Harmony / 041E",
    "Ever Given / 231S"
  ][selectedBookingNumber % 5];
  const [selectedVesselName, selectedVoyage = ""] = selectedVessel.split(" / ");
  const defaultLocationOption = selectedLocationType === "Door" ? "Door" : "Ramp (CY)";
  const initialRouteScheduleForm = {
    originPort: "",
    originLocationType: defaultLocationOption,
    destinationPort: "",
    destinationLocationType: defaultLocationOption,
    vesselName: "",
    voyage: "",
    etd: "2026-03-15",
    eta: "2026-03-22"
  };
  const initialCarrierInteractionForm = {
    carrier: selectedCarrier,
    carrierBookingNo: "",
    bookingConfirmationFileName: ""
  };
  const initialGeneralInfoForm = {
    customer: "",
    linkedQuote: "",
    estimatedRate: "",
    contactName: "",
    email: "",
    phone: ""
  };
  const initialValueAddedServicesForm = {
    inlandTransport: false,
    customsServices: [] as string[],
    valueProtect: [] as string[]
  };
  const scheduleOriginLabel = selectedBookingRow ? formatPortFilterLabel(selectedBookingRow.route.from) : "";
  const scheduleDestinationLabel = selectedBookingRow ? formatPortFilterLabel(selectedBookingRow.route.to) : "";
  const [routeScheduleForm, setRouteScheduleForm] = useState(initialRouteScheduleForm);
  const normalizedOriginPortQuery = routeScheduleForm.originPort.trim().toLowerCase();
  const normalizedDestinationPortQuery = routeScheduleForm.destinationPort.trim().toLowerCase();
  const recentOriginPortOptions = recentOriginPortSearches
    .map((label) => portSearchOptions.find((option) => option.label === label))
    .filter((option): option is (typeof portSearchOptions)[number] => Boolean(option));
  const recentDestinationPortOptions = recentDestinationPortSearches
    .map((label) => portSearchOptions.find((option) => option.label === label))
    .filter((option): option is (typeof portSearchOptions)[number] => Boolean(option));
  const originPortDropdownOptions =
    normalizedOriginPortQuery.length >= 3
      ? portSearchOptions.filter((option) => option.searchText.includes(normalizedOriginPortQuery))
      : recentOriginPortOptions;
  const destinationPortDropdownOptions =
    normalizedDestinationPortQuery.length >= 3
      ? portSearchOptions.filter((option) => option.searchText.includes(normalizedDestinationPortQuery))
      : recentDestinationPortOptions;
  const [carrierInteractionForm, setCarrierInteractionForm] = useState(initialCarrierInteractionForm);
  const [generalInfoForm, setGeneralInfoForm] = useState(initialGeneralInfoForm);
  const [valueAddedServicesForm, setValueAddedServicesForm] = useState(initialValueAddedServicesForm);
  const normalizedCustomerQuery = generalInfoForm.customer.trim().toLowerCase();
  const recentCustomerOptions = recentCustomerSearches
    .map((value) => customerSearchOptions.find((option) => option.value === value))
    .filter((option): option is SelectOption => Boolean(option));
  const customerDropdownOptions =
    normalizedCustomerQuery.length >= 3
      ? customerSearchOptions.filter((option) => option.label.toLowerCase().includes(normalizedCustomerQuery))
      : recentCustomerOptions;
  const [internalNotes, setInternalNotes] = useState("");
  const hasBookingCreateChanges =
    routeScheduleForm.originPort !== initialRouteScheduleForm.originPort ||
    routeScheduleForm.originLocationType !== initialRouteScheduleForm.originLocationType ||
    routeScheduleForm.destinationPort !== initialRouteScheduleForm.destinationPort ||
    routeScheduleForm.destinationLocationType !== initialRouteScheduleForm.destinationLocationType ||
    routeScheduleForm.vesselName !== initialRouteScheduleForm.vesselName ||
    routeScheduleForm.voyage !== initialRouteScheduleForm.voyage ||
    routeScheduleForm.etd !== initialRouteScheduleForm.etd ||
    routeScheduleForm.eta !== initialRouteScheduleForm.eta ||
    carrierInteractionForm.carrier !== initialCarrierInteractionForm.carrier ||
    carrierInteractionForm.carrierBookingNo !== initialCarrierInteractionForm.carrierBookingNo ||
    carrierInteractionForm.bookingConfirmationFileName !== initialCarrierInteractionForm.bookingConfirmationFileName ||
    generalInfoForm.customer !== initialGeneralInfoForm.customer ||
    generalInfoForm.linkedQuote !== initialGeneralInfoForm.linkedQuote ||
    generalInfoForm.estimatedRate !== initialGeneralInfoForm.estimatedRate ||
    generalInfoForm.contactName !== initialGeneralInfoForm.contactName ||
    generalInfoForm.email !== initialGeneralInfoForm.email ||
    generalInfoForm.phone !== initialGeneralInfoForm.phone ||
    valueAddedServicesForm.inlandTransport !== initialValueAddedServicesForm.inlandTransport ||
    !arraysEqual(valueAddedServicesForm.customsServices, initialValueAddedServicesForm.customsServices) ||
    !arraysEqual(valueAddedServicesForm.valueProtect, initialValueAddedServicesForm.valueProtect) ||
    internalNotes !== "";
  const hasCustomerCreateChanges =
    customerCreateForm.customerName !== initialCustomerCreateForm.customerName ||
    customerCreateForm.englishName !== initialCustomerCreateForm.englishName ||
    customerCreateForm.taxId !== initialCustomerCreateForm.taxId ||
    customerCreateForm.customerGroup !== initialCustomerCreateForm.customerGroup ||
    customerCreateForm.customerType !== initialCustomerCreateForm.customerType ||
    !arraysEqual(customerCreateForm.services, initialCustomerCreateForm.services) ||
    customerCreateForm.priority !== initialCustomerCreateForm.priority ||
    customerCreateForm.salesperson !== initialCustomerCreateForm.salesperson ||
    customerCreateForm.source !== initialCustomerCreateForm.source ||
    !arraysEqual(customerCreateForm.responsibleCompanies, initialCustomerCreateForm.responsibleCompanies) ||
    customerCreateForm.phone !== initialCustomerCreateForm.phone ||
    customerCreateForm.email !== initialCustomerCreateForm.email ||
    customerCreateForm.website !== initialCustomerCreateForm.website ||
    !arraysEqual(customerCreateForm.tags, initialCustomerCreateForm.tags) ||
    customerCreateForm.status !== initialCustomerCreateForm.status ||
    customerCreateForm.contractCode !== initialCustomerCreateForm.contractCode ||
    customerInternalNotes.trim() !== "";
  const normalizedCustomerDetailAddressRows =
    isCustomerAddressFormOpen && (hasCustomerAddressDraft || (isCustomerDetailsPage && isCustomerDetailEditable))
      ? [...customerAddressRows, customerAddressForm]
      : customerAddressRows;
  const normalizedCustomerDetailContactRows =
    isCustomerContactFormOpen && (hasCustomerContactDraft || (isCustomerDetailsPage && isCustomerDetailEditable))
      ? [...customerContactRows, customerContactForm]
      : customerContactRows;
  const normalizedCustomerDetailRouteRows =
    isCustomerRouteFormOpen && (hasCustomerRouteDraft || (isCustomerDetailsPage && isCustomerDetailEditable))
      ? [...customerRouteRows, customerRouteForm]
      : customerRouteRows;
  const hasCustomerDetailChanges =
    !!customerDetailInitialForm &&
    (
      customerCreateForm.customerName !== customerDetailInitialForm.customerName ||
      customerCreateForm.englishName !== customerDetailInitialForm.englishName ||
      customerCreateForm.taxId !== customerDetailInitialForm.taxId ||
      customerCreateForm.customerGroup !== customerDetailInitialForm.customerGroup ||
      customerCreateForm.customerType !== customerDetailInitialForm.customerType ||
      !arraysEqual(customerCreateForm.services, customerDetailInitialForm.services) ||
      customerCreateForm.priority !== customerDetailInitialForm.priority ||
      customerCreateForm.salesperson !== customerDetailInitialForm.salesperson ||
      customerCreateForm.source !== customerDetailInitialForm.source ||
      !arraysEqual(customerCreateForm.responsibleCompanies, customerDetailInitialForm.responsibleCompanies) ||
      customerCreateForm.phone !== customerDetailInitialForm.phone ||
      customerCreateForm.email !== customerDetailInitialForm.email ||
      customerCreateForm.website !== customerDetailInitialForm.website ||
      !arraysEqual(customerCreateForm.tags, customerDetailInitialForm.tags) ||
      customerCreateForm.status !== customerDetailInitialForm.status ||
      customerCreateForm.contractCode !== customerDetailInitialForm.contractCode ||
      JSON.stringify(normalizedCustomerDetailAddressRows) !== JSON.stringify(customerDetailSeededAddressRows) ||
      JSON.stringify(normalizedCustomerDetailContactRows) !== JSON.stringify(customerDetailSeededContactRows) ||
      JSON.stringify(normalizedCustomerDetailRouteRows) !== JSON.stringify(customerDetailSeededRouteRows) ||
      customerInternalNotes !== customerDetailInitialNotes
    );
  const hasContractCreateChanges =
    contractCreateForm.code !== initialContractCreateForm.code ||
    contractCreateForm.customer !== initialContractCreateForm.customer ||
    contractCreateForm.contractCompany !== initialContractCreateForm.contractCompany ||
    contractCreateForm.contractType !== initialContractCreateForm.contractType ||
    contractCreateForm.signedAt !== initialContractCreateForm.signedAt ||
    contractCreateForm.validFrom !== initialContractCreateForm.validFrom ||
    contractCreateForm.validTo !== initialContractCreateForm.validTo ||
    contractCreateForm.status !== initialContractCreateForm.status ||
    !arraysEqual(contractCreateForm.services, initialContractCreateForm.services) ||
    JSON.stringify(contractCreateForm.serviceItems) !== JSON.stringify(initialContractCreateForm.serviceItems) ||
    contractCreateForm.notes !== initialContractCreateForm.notes ||
    contractRateRows.length > 0 ||
    hasContractRateDraft ||
    contractDomesticRows.length > 0 ||
    hasContractDomesticDraft ||
    contractDocumentRows.length > 0 ||
    hasContractDocumentDraft;
  const runWithLeaveGuard = (action: () => void) => {
    action();
  };
  const [customerDetailNote, setCustomerDetailNote] = useState("");
  const selectedBookingDetailsEquipment: BookingEquipmentRow[] =
    selectedBookingRow?.cargoType === "Reefer"
      ? [
          {
            equipment: "40' Reefer",
            quantity: "2",
            weight: "39,200 KG",
            commodity: "Reefer",
            description: "Thực phẩm đông lạnh"
          }
        ]
      : selectedBookingRow?.cargoType === "Dangerous"
        ? [
            {
              equipment: "20' Dry",
              quantity: "1",
              weight: "18,500 KG",
              commodity: "Dangerous",
              description: "Hóa chất công nghiệp"
            },
            {
              equipment: "40' HC",
              quantity: "1",
              weight: "22,100 KG",
              commodity: "Dangerous",
              description: "Sơn và dung môi"
            }
          ]
        : [
            {
              equipment: "40' HC",
              quantity: "2",
              weight: "18,000 KG",
              commodity: "Dry",
              description: "Furniture"
            },
            {
              equipment: "20' Dry",
              quantity: "1",
              weight: "12,500 KG",
              commodity: selectedBookingRow?.cargoType ?? "Dry",
              description: "Electronics"
            }
          ];
  const [equipmentRows, setEquipmentRows] = useState<BookingEquipmentRow[]>(
    isCreatePage ? [createEmptyEquipmentRow()] : selectedBookingDetailsEquipment
  );
  const priceBreakdownRows = [
    {
      group: "Ocean Freight",
      detail: "Cước chính (FAK)",
      unit: "Per Cont",
      rate20: "USD 850",
      rate40: "USD 1,500",
      currency: "USD",
      tone: "ocean"
    },
    {
      group: "Phụ phí",
      detail: "BAF (Bunker Adjustment Factor)",
      unit: "Per Cont",
      rate20: "USD 120",
      rate40: "USD 210",
      currency: "USD",
      tone: "surcharge"
    },
    {
      group: "Phụ phí",
      detail: "LSS (Low Sulphur Surcharge)",
      unit: "Per Cont",
      rate20: "USD 35",
      rate40: "USD 65",
      currency: "USD",
      tone: "surcharge"
    },
    {
      group: "Phụ phí",
      detail: "PSS (Peak Season Surcharge)",
      unit: "Per Cont",
      rate20: "USD 0",
      rate40: "USD 0",
      currency: "USD",
      tone: "surcharge"
    },
    {
      group: "Local (Origin)",
      detail: "THC - Cảng đi",
      unit: "Per Cont",
      rate20: "USD 95",
      rate40: "USD 145",
      currency: "USD",
      tone: "origin"
    },
    {
      group: "Local (Origin)",
      detail: "Phí chứng từ (Documentation)",
      unit: "Per B/L",
      rate20: "USD 50",
      rate40: "USD 50",
      currency: "USD",
      tone: "origin"
    },
    {
      group: "Local (Origin)",
      detail: "Phí niêm phong (Seal)",
      unit: "Per Cont",
      rate20: "USD 12",
      rate40: "USD 12",
      currency: "USD",
      tone: "origin"
    },
    {
      group: "Local (Dest)",
      detail: "THC - Cảng đến",
      unit: "Per Cont",
      rate20: "USD 110",
      rate40: "USD 170",
      currency: "USD",
      tone: "destination"
    },
    {
      group: "Local (Dest)",
      detail: "D/O Fee",
      unit: "Per B/L",
      rate20: "USD 65",
      rate40: "USD 65",
      currency: "USD",
      tone: "destination"
    }
  ] as const;

  useEffect(() => {
    setRouteScheduleForm({
      originPort: isCreatePage ? "" : scheduleOriginLabel,
      originLocationType: defaultLocationOption,
      destinationPort: isCreatePage ? "" : scheduleDestinationLabel,
      destinationLocationType: defaultLocationOption,
      vesselName: isCreatePage ? "" : selectedVesselName,
      voyage: isCreatePage ? "" : selectedVoyage,
      etd: "2026-03-15",
      eta: "2026-03-22"
    });
  }, [defaultLocationOption, isCreatePage, scheduleDestinationLabel, scheduleOriginLabel, selectedVesselName, selectedVoyage, selectedBookingCode]);

  useEffect(() => {
    setCarrierInteractionForm({
      carrier: selectedCarrier,
      carrierBookingNo: "",
      bookingConfirmationFileName: ""
    });
  }, [selectedCarrier, selectedBookingCode]);

  useEffect(() => {
    setGeneralInfoForm({
      customer: "",
      linkedQuote: "",
      estimatedRate: "",
      contactName: "",
      email: "",
      phone: ""
    });
  }, [selectedBookingCode]);

  useEffect(() => {
    setInternalNotes("");
  }, [selectedBookingCode]);

  useEffect(() => {
    setCustomerDetailNote("");
  }, [selectedCustomerKey]);

  useEffect(() => {
    setValueAddedServicesForm({
      inlandTransport: false,
      customsServices: [],
      valueProtect: []
    });
  }, [selectedBookingCode]);

  useEffect(() => {
    setEquipmentRows(isCreatePage ? [createEmptyEquipmentRow()] : selectedBookingDetailsEquipment);
  }, [isCreatePage, selectedBookingCode]);

  useEffect(() => {
    const shell = desktopTableShellRef.current;
    const body = desktopTableBodyRef.current;
    if (!shell || !body) {
      return;
    }

    const HEADER_HEIGHT = 44;
    const ROW_HEIGHT = 48;

    const updateTableMetrics = () => {
      const availableBodyHeight = shell.clientHeight - HEADER_HEIGHT;
      const snappedHeight = Math.max(ROW_HEIGHT, Math.floor(availableBodyHeight / ROW_HEIGHT) * ROW_HEIGHT);
      setDesktopRowsHeight(snappedHeight);
      setDesktopScrollbarWidth(body.offsetWidth - body.clientWidth);
    };

    updateTableMetrics();

    const observer = new ResizeObserver(updateTableMetrics);
    observer.observe(shell);
    observer.observe(body);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const body = customerTableBodyRef.current;
    if (!body) {
      return;
    }

    const updateScrollbarWidth = () => {
      setCustomerTableScrollbarWidth(body.offsetWidth - body.clientWidth);
    };

    updateScrollbarWidth();

    const observer = new ResizeObserver(updateScrollbarWidth);
    observer.observe(body);

    return () => observer.disconnect();
  }, [isCustomerListPage, visibleCustomerRows.length]);

  useEffect(() => {
    const body = contractTableBodyRef.current;
    if (!body) {
      return;
    }

    const updateScrollbarWidth = () => {
      setContractTableScrollbarWidth(body.offsetWidth - body.clientWidth);
    };

    updateScrollbarWidth();

    const observer = new ResizeObserver(updateScrollbarWidth);
    observer.observe(body);

    return () => observer.disconnect();
  }, [isCustomerContractsPage, visibleContractRows.length]);

  useEffect(() => {
    const body = serviceConfigTableBodyRef.current;
    if (!body) {
      return;
    }

    const updateScrollbarWidth = () => {
      setServiceConfigTableScrollbarWidth(body.offsetWidth - body.clientWidth);
    };

    updateScrollbarWidth();

    const observer = new ResizeObserver(updateScrollbarWidth);
    observer.observe(body);

    return () => observer.disconnect();
  }, [isCustomerServicesPage, visibleServiceConfigRows.length]);

  useEffect(() => {
    const scrollElement = detailsScrollRef.current;
    const introCardElement = detailsIntroCardRef.current;

    if (!selectedBookingCode || !scrollElement || !introCardElement) {
      setShowStickyDetailsStatus(false);
      return;
    }

    const updateStickyStatus = () => {
      const threshold = Math.max(24, introCardElement.offsetHeight - 32);
      setShowStickyDetailsStatus(scrollElement.scrollTop >= threshold);
    };

    updateStickyStatus();
    scrollElement.addEventListener("scroll", updateStickyStatus, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", updateStickyStatus);
    };
  }, [selectedBookingCode]);

  useEffect(() => {
    if (isCustomerServicesPage) {
      setServiceConfigListPageNumber(1);
    }
  }, [isCustomerServicesPage, selectedServiceScope, searchQuery]);

  return (
    <main className="h-screen overflow-hidden bg-background">
      <div className="flex h-screen w-full flex-col overflow-visible bg-background">
        <div className="flex flex-1 items-start overflow-hidden">
          <div className="hidden w-[240px] shrink-0 lg:block" aria-hidden="true" />

          <aside className="fixed left-0 top-0 hidden h-screen w-[240px] border-r border-[#1F2937] bg-[#0F172A] lg:block">
            <div className="sticky top-0 z-10 flex h-14 items-center bg-[#0F172A] px-6">
              <SidebarLogo onClick={showBookingList} />
            </div>
            <div className="border-b-[0.5px] border-[#1F2937]" />
            <div className="flex h-[calc(100vh-56px)] flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-0">
                {sidebarGroups.map((group) => (
                  <div key={group.title} className="rounded-2xl">
                    {(() => {
                      const isGroupOpen = group.items ? openSidebarGroups.includes(group.title) : false;
                      const isCustomersGroup = group.title === "Quản lý khách hàng";
                      const isDocumentsGroup = group.title === "Quản lý Shipment";
                      const isGroupActive = isDocumentsGroup ? isCustomerShipmentPage : false;
                      return (
                        <>
                    <button
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition-colors ${
                        isGroupActive
                          ? "bg-[#1E293B] font-medium text-white"
                          : "text-[#CBD5E1] hover:bg-[#111C31] hover:text-white"
                      }`}
                      onClick={() => {
                        if (group.items) {
                          setOpenSidebarGroups((current) =>
                            current.includes(group.title)
                              ? current.filter((title) => title !== group.title)
                              : [...current, group.title]
                          );
                          if (isDocumentsGroup) {
                            showCustomerShipments("list");
                          }
                          return;
                        }

                        if (isDocumentsGroup) {
                          showCustomerShipments("list");
                        }
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <SidebarGroupIcon
                          icon={group.icon}
                          className={isGroupActive ? "text-white" : "text-[#94A3B8]"}
                        />
                        <span>{group.title}</span>
                      </span>
                      {group.items ? (
                        <ChevronDown
                          className={`h-4 w-4 text-[#94A3B8] transition-transform ${isGroupOpen ? "" : "-rotate-90"}`}
                          strokeWidth={1.8}
                        />
                      ) : null}
                    </button>

                    {isGroupOpen ? (
                      <div className="space-y-0 pb-3">
                        {group.items?.map((item) => (
                          <div
                            key={item.label}
                            className={`flex cursor-pointer items-center gap-[24px] rounded-xl px-4 py-2 text-[14px] transition-colors ${
                              ((isCustomersGroup &&
                              ((item.label === "Khách hàng" && (isCustomerListPage || isCustomerDetailsPage || isCustomerCreatePage)) ||
                                (item.label === "Hợp đồng" && (isCustomerContractsPage || isContractDetailsPage || isCustomerContractCreatePage)) ||
                                (item.label === "Dịch vụ" && isCustomerServicesPage))) ||
                              (isDocumentsGroup &&
                                ((item.label === "Customs (Hải quan)" && isCustomerCustomsPage) ||
                                  (item.label === "Inland (Nội địa)" && isCustomerInlandPage) ||
                                  (item.label === "Oversea (Quốc tế)" && isCustomerOverseaPage))))
                                ? "bg-[#1E293B] text-white"
                                : "text-[#CBD5E1] hover:bg-[#111C31] hover:text-white"
                            }`}
                            onClick={
                              isCustomersGroup && item.label === "Khách hàng"
                                ? showCustomerList
                                : isCustomersGroup && item.label === "Hợp đồng"
                                  ? showCustomerContracts
                                  : isCustomersGroup && item.label === "Dịch vụ"
                                    ? showCustomerServices
                                    : isDocumentsGroup && item.label === "Customs (Hải quan)"
                                      ? showCustomerCustoms
                                      : isDocumentsGroup && item.label === "Inland (Nội địa)"
                                        ? showCustomerInland
                                        : isDocumentsGroup && item.label === "Oversea (Quốc tế)"
                                          ? showCustomerOversea
                                : undefined
                            }
                          >
                            <span
                              className={`h-[2px] w-[2px] rounded-full ${
                                ((isCustomersGroup &&
                                ((item.label === "Khách hàng" && (isCustomerListPage || isCustomerDetailsPage || isCustomerCreatePage)) ||
                                  (item.label === "Hợp đồng" && (isCustomerContractsPage || isContractDetailsPage)) ||
                                  (item.label === "Dịch vụ" && isCustomerServicesPage))) ||
                                  (isDocumentsGroup &&
                                    ((item.label === "Customs (Hải quan)" && isCustomerCustomsPage) ||
                                      (item.label === "Inland (Nội địa)" && isCustomerInlandPage) ||
                                      (item.label === "Oversea (Quốc tế)" && isCustomerOverseaPage))))
                                  ? "bg-white"
                                  : "bg-[#64748B]"
                              }`}
                            />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                        </>
                      );
                    })()}
                  </div>
                ))}
                </div>
              </div>
              <div className="px-4 py-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors hover:bg-[#111C31]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5B8DEF] text-[16px] font-semibold text-white">
                    {currentUserName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{currentUserName}</span>
                  </span>
                </button>
              </div>
            </div>
          </aside>

          <section className={`flex h-screen flex-1 flex-col bg-background px-4 py-3 md:px-6 md:py-3 ${isAnyCreatePage || isCustomerShipmentPage ? "overflow-y-auto" : "overflow-hidden"}`}>
            <div className="-mx-4 mb-0 border-b-[0.5px] border-border md:-mx-6">
              <div className={`flex flex-col px-4 md:px-6 ${isCustomerShipmentPage && !isCustomerShipmentListPage ? "gap-1 pb-0" : "gap-3 pb-2"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {isCustomerShipmentPage && !isCustomerShipmentListPage ? (
                      <>
                        <div className="inline-flex w-fit items-center gap-1 border-b border-[#E7E6E9]">
                          {shipmentWorkspaceTabs.map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => setShipmentWorkspaceTab(tab.key)}
                              className={`inline-flex h-9 items-center border-b-[1.5px] px-4 text-[13px] font-medium transition ${
                                shipmentWorkspaceTab === tab.key
                                  ? "border-[#2054a3] text-[#2054a3]"
                                  : "border-transparent text-foreground hover:border-[#D7DEEA] hover:text-[#2054a3]"
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                        <div className="text-[12px] text-muted-foreground">{currentShipmentBreadcrumb}</div>
                      </>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-[16px] font-semibold leading-[1.2] text-foreground">
                          <span>{isCustomerPage ? "Quản lý khách hàng" : "Quản lý Shipment"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <HeaderIconButton>
                      <MessagesSquare className="h-4 w-4" strokeWidth={1.8} />
                    </HeaderIconButton>
                    <HeaderIconButton
                      onClick={
                        isCustomerShipmentDetailsPage
                          ? openShipmentDetailAuditSection
                          : isCustomerCustomsPage
                            ? openCustomsAuditSection
                            : isCustomerInlandPage
                              ? openInlandAuditSection
                              : isCustomerOverseaPage
                                ? openOverseaAuditSection
                                : undefined
                      }
                    >
                      <History className="h-4 w-4" strokeWidth={1.8} />
                    </HeaderIconButton>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_minmax(0,520px)_1fr] lg:items-center lg:gap-4">
                    <div className="flex flex-wrap items-center gap-2 lg:col-start-1 lg:justify-self-start">
                      {isCustomerListPage || isCustomerContractsPage || isCustomerServicesPage ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (isCustomerContractsPage) {
                              openCreateContract();
                              return;
                            }

                            if (isCustomerServicesPage) {
                              return;
                            }

                            openCreateCustomer();
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-full bg-[#2054a3] px-2.5 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                        >
                          <Plus className="h-3 w-3" strokeWidth={2.2} />
                          <span>Thêm mới</span>
                        </button>
                      ) : null}
                      {isCustomerCreateLikePage || isCustomerContractCreatePage || isContractDetailsPage || isServiceDetailsPage ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={goBackFromCreatePage}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white transition hover:bg-[#fafafa]"
                            aria-label="Quay lại"
                          >
                            <ChevronLeft className="h-5 w-5 text-[#2054a3]" strokeWidth={2.2} />
                          </button>
                          <div className="leading-[1.2]">
                            <div className="text-[16px] font-medium text-foreground">
                              {isCustomerDetailsPage
                                ? "Khách hàng"
                                : isContractDetailsPage
                                  ? "Hợp đồng"
                                  : isServiceDetailsPage
                                    ? "Dịch vụ"
                                    : currentPageTitle}
                            </div>
                            {isCustomerDetailsPage && selectedCustomerRow ? (
                              <div ref={customerTitleMenuRef} className="relative mt-[2px]">
                                <button
                                  type="button"
                                  onClick={() => setIsCustomerTitleMenuOpen((current) => !current)}
                                  className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <span>{selectedCustomerRow.customerCode}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform ${isCustomerTitleMenuOpen ? "rotate-180" : ""}`}
                                    strokeWidth={1.8}
                                  />
                                </button>

                                {isCustomerTitleMenuOpen ? (
                                  <div className="absolute left-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                    {[
                                      {
                                        label: "Xóa",
                                        icon: Trash2,
                                        onClick: deleteCustomerFromDetails,
                                      },
                                      {
                                        label: "Nhân bản",
                                        icon: Copy,
                                        onClick: duplicateCustomerFromDetails,
                                      },
                                      {
                                        label: selectedCustomerToggleLabel,
                                        icon: selectedCustomerRow?.status === "locked" ? LockOpen : Lock,
                                        onClick: toggleCustomerLockFromDetails,
                                      },
                                    ].map((item, itemIndex) => (
                                      <button
                                        key={item.label}
                                        type="button"
                                        onClick={item.onClick}
                                        className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                          itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                        }`}
                                      >
                                        <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                        <span>{item.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : isContractDetailsPage && selectedContractRow ? (
                              <div ref={detailsActionMenuRef} className="relative mt-[2px]">
                                <button
                                  type="button"
                                  onClick={() => setIsDetailsActionMenuOpen((current) => !current)}
                                  className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <span>{selectedContractRow.code}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform ${isDetailsActionMenuOpen ? "rotate-180" : ""}`}
                                    strokeWidth={1.8}
                                  />
                                </button>

                                {isDetailsActionMenuOpen ? (
                                  <div className="absolute left-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                    {[
                                      {
                                        label: "Xóa",
                                        icon: Trash2,
                                        onClick: deleteContractFromDetails,
                                      },
                                      {
                                        label: "Nhân bản",
                                        icon: Copy,
                                        onClick: duplicateContractFromDetails,
                                      },
                                      {
                                        label: selectedContractRow.status === "terminated" ? "Mở lại" : "Chấm dứt",
                                        icon: selectedContractRow.status === "terminated" ? LockOpen : Lock,
                                        onClick: toggleContractTerminationFromDetails,
                                      },
                                    ].map((item, itemIndex) => (
                                      <button
                                        key={item.label}
                                        type="button"
                                        onClick={item.onClick}
                                        className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                          itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                        }`}
                                      >
                                        <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                        <span>{item.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : isServiceDetailsPage && selectedServiceDetailScope ? (
                              <div className="mt-[2px] text-[12px] font-medium text-muted-foreground">
                                {selectedServiceDetailDisplayName}
                              </div>
                            ) : null}
                          </div>
                          {isCustomerCreateLikePage && (!isCustomerDetailsPage || (isCustomerDetailEditable && hasCustomerDetailChanges)) ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveCustomer}
                                disabled={isCustomerDetailsPage && !isCustomerDetailEditable}
                                className={`inline-flex h-8 items-center rounded-full px-2.5 text-[13px] font-medium text-white transition ${
                                  isCustomerDetailsPage && !isCustomerDetailEditable
                                    ? "cursor-not-allowed bg-[#9FB4D6]"
                                    : "bg-[#2054a3] hover:bg-[#1b467d]"
                                }`}
                              >
                                Lưu KH
                              </button>
                              <button
                                type="button"
                                onClick={goBackFromCreatePage}
                                className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-2.5 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                              >
                                Hủy bỏ
                              </button>
                            </>
                          ) : null}
                          {isCustomerContractCreatePage ? (
                            <>
                              <button
                                type="button"
                                onClick={handleSaveContract}
                                className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-2.5 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                              >
                                Lưu HĐ
                              </button>
                              <button
                                type="button"
                                onClick={goBackFromCreatePage}
                                className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-2.5 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                              >
                                Hủy bỏ
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : isCustomerShipmentListPage ? (
                        <div className="leading-[1.25]">
                          <div className="text-[16px] font-medium text-foreground">Shipment Lists</div>
                        </div>
                      ) : isCustomerListPage || isCustomerContractsPage || isCustomerServicesPage ? (
                        <div ref={customerTitleMenuRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setIsCustomerTitleMenuOpen((current) => !current)}
                            className="inline-flex items-center gap-1 text-[16px] font-medium leading-[1.25] text-foreground"
                          >
                            <span>{currentPageTitle}</span>
                            <ChevronDown
                              className={`h-4 w-4 text-muted-foreground transition-transform ${isCustomerTitleMenuOpen ? "rotate-180" : ""}`}
                              strokeWidth={1.8}
                            />
                          </button>

                          {isCustomerTitleMenuOpen ? (
                            <div className="absolute left-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                              {(
                                isCustomerServicesPage
                                  ? servicePageMenuOptions.map((service) => ({
                                      label: service,
                                      icon: null,
                                      onClick: () => {
                                        if (service === "🌍 Vận tải quốc tế") {
                                          setSelectedServiceScope(service);
                                        }
                                        setIsCustomerTitleMenuOpen(false);
                                      },
                                    }))
                                  : [
                                      isCustomerContractsPage
                                        ? {
                                            label: "Import Hợp đồng",
                                            icon: Upload,
                                            onClick: () => {
                                              setIsCustomerTitleMenuOpen(false);
                                              openContractImportModal();
                                            },
                                          }
                                        : {
                                            label: "Import khách hàng",
                                            icon: Upload,
                                            onClick: () => {
                                              setIsCustomerTitleMenuOpen(false);
                                              openCustomerImportModal();
                                            },
                                          },
                                      isCustomerContractsPage
                                        ? {
                                            label: "Export Hợp đồng",
                                            icon: Download,
                                            onClick: exportContractRecords,
                                          }
                                        : {
                                            label: "Export khách hàng",
                                            icon: Download,
                                            onClick: exportCustomerRecords,
                                          },
                                    ]
                              ).map((item, itemIndex) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={item.onClick}
                                  className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                    itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                  }`}
                                >
                                  {item.icon ? <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} /> : null}
                                  <span>{item.label}</span>
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : isCustomerShipmentPage ? null : (
                        <div className="leading-[1.25]">
                          <div className="text-[16px] font-medium text-foreground">
                            <span>{isCustomerDetailsPage ? "Khách hàng" : currentPageTitle}</span>
                          </div>
                          {isCustomerDetailsPage && selectedCustomerRow ? (
                            <div className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                              {selectedCustomerRow.customerCode}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 lg:col-start-2">
                      <div ref={globalSearchMenuRef} className="relative w-full">
                        {isCustomerCreateLikePage ? (
                          <div className="relative z-30 flex flex-wrap items-center justify-center gap-2">
                            {customerCreateHeaderMetrics.map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  if (item.label === "Hợp đồng" && item.contractCode) {
                                    openContractDetails(item.contractCode);
                                  }
                                }}
                                className="inline-flex h-10 items-center rounded-full border-[0.5px] border-input bg-card px-4 text-base font-medium text-foreground shadow-subtle transition hover:bg-[#fafafa] active:bg-[#f2f2f2]"
                              >
                                <span>{`${item.value} ${item.label}`}</span>
                              </button>
                            ))}
                          </div>
                        ) : isCustomerContractCreatePage || isContractDetailsPage ? (
                          <div className="relative z-30 flex flex-wrap items-center justify-center gap-2">
                            {contractCreateHeaderMetrics.map((item) => (
                              <button
                                key={item.label}
                                type="button"
                                className="inline-flex h-10 items-center rounded-full border-[0.5px] border-input bg-card px-4 text-base font-medium text-foreground shadow-subtle transition hover:bg-[#fafafa] active:bg-[#f2f2f2]"
                              >
                                <span>{`${item.value} ${item.label}`}</span>
                              </button>
                            ))}
                          </div>
                        ) : isServiceDetailsPage ? (
                          <div />
                        ) : null}
                        {isCustomerSelectionMode ? (
                          <div className="relative z-30 flex items-center justify-center gap-2">
                            <div className="inline-flex h-10 items-center gap-2 rounded-full border-[0.5px] border-input bg-card px-4 text-base font-medium text-foreground shadow-subtle">
                              <span>{`${selectedCustomerRowKeys.length} đã chọn`}</span>
                              <button
                                type="button"
                                aria-label="Clear selected rows"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#4A63B8] transition hover:bg-[rgba(74,99,184,0.08)]"
                                onClick={() => setSelectedCustomerRowKeys([])}
                              >
                                <X className="h-4 w-4" strokeWidth={2.2} />
                              </button>
                            </div>
                            <div ref={customerBulkActionMenuRef} className="relative">
                              <button
                                type="button"
                                className="inline-flex h-10 items-center gap-2 rounded-full border-[0.5px] border-input bg-card px-4 text-base font-medium text-foreground transition hover:bg-[#fafafa] shadow-subtle"
                                onClick={() => setIsCustomerBulkActionMenuOpen((current) => !current)}
                              >
                                <Settings className="h-4 w-4" strokeWidth={2.2} />
                                <span>Tác vụ</span>
                              </button>

                              {isCustomerBulkActionMenuOpen ? (
                                <div className="absolute left-0 top-full z-40 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                  {[
                                    {
                                      label: "Xóa",
                                      icon: Trash2,
                                      onClick: () => setIsCustomerBulkActionMenuOpen(false),
                                    },
                                    {
                                      label: "Nhân bản",
                                      icon: Copy,
                                      onClick: () => setIsCustomerBulkActionMenuOpen(false),
                                    },
                                    {
                                      label: "Export",
                                      icon: Download,
                                      onClick: () => {
                                        setIsCustomerBulkActionMenuOpen(false);
                                        exportCustomerRecords();
                                      },
                                    },
                                  ].map((item, itemIndex) => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      onClick={item.onClick}
                                      className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                        itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                      }`}
                                    >
                                      <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {isGlobalSearchMenuOpen && !isCustomerSelectionMode ? (
                          <button
                            type="button"
                            aria-label="Close search overlay"
                            className="fixed inset-0 z-20 bg-[rgba(17,17,17,0.18)]"
                            onClick={() => setIsGlobalSearchMenuOpen(false)}
                          />
                        ) : null}

                        <label
                          className={`relative z-30 flex h-10 w-full items-center gap-2 rounded-full border-[0.5px] border-input bg-card px-4 text-base text-muted-foreground transition shadow-subtle ${
                            isCustomerSelectionMode || isCustomerCreateLikePage || isCustomerContractCreatePage || isContractDetailsPage || isServiceDetailsPage || (isCustomerShipmentPage && !isCustomerShipmentListPage) ? "hidden" : ""
                          }`}
                        >
                          <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                          <input
                            value={searchQuery}
                            onFocus={() => setIsGlobalSearchMenuOpen(true)}
                            onChange={(event) => {
                              setSearchQuery(event.target.value);
                              setIsGlobalSearchMenuOpen(true);
                            }}
                            placeholder={moduleSearchPlaceholder}
                            className="w-full min-w-0 border-0 bg-transparent p-0 text-base text-foreground placeholder:text-muted-foreground outline-none"
                          />
                          <span className="h-5 w-px shrink-0 bg-border" />
                          <button
                            type="button"
                            className="ui-hover-card -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors"
                            onClick={() => setIsGlobalSearchMenuOpen((current) => !current)}
                          >
                            <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </label>

                        {isGlobalSearchMenuOpen && !isCustomerSelectionMode ? (
                          <div className="absolute left-1/2 top-full z-40 w-[130%] -translate-x-1/2 overflow-hidden rounded-[16px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                            <div className="grid gap-0 md:grid-cols-3">
                              <div className="border-b-[0.5px] border-[#E7E6E9] px-5 py-4 md:border-b-0 md:border-r-[0.5px]">
                                <div className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
                                  <Filter className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={1.9} />
                                  <span>Bộ lọc</span>
                                </div>
                                <div className="mt-4 space-y-0">
                                  {activeSearchFilterSections.map((section, sectionIndex) => {
                                    return (
                                      <div
                                        key={section.title}
                                        className={sectionIndex === 0 ? "" : "border-t-[0.5px] border-[#E7E6E9] pt-3"}
                                      >
                                        <div className={sectionIndex === activeSearchFilterSections.length - 1 ? "" : "pb-3"}>
                                          <div className="mb-2 text-[13px] font-medium uppercase leading-5 tracking-[0.04em] text-muted-foreground">
                                            {section.title}
                                          </div>
                                          <div className="space-y-2 text-[14px] leading-5 text-foreground">
                                            {section.items.map((item) => {
                                              const isSelected = (selectedSearchFilters[section.title] ?? []).includes(item);

                                              return (
                                                <button
                                                  key={item}
                                                  type="button"
                                                  className={`flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-[#245698] ${
                                                    isSelected ? "font-semibold" : ""
                                                  }`}
                                                  onClick={() =>
                                                    setSelectedSearchFilters((current) => {
                                                      const currentItems = current[section.title] ?? [];
                                                      const nextItems = currentItems.includes(item)
                                                        ? currentItems.filter((currentItem) => currentItem !== item)
                                                        : [...currentItems, item];

                                                      return {
                                                        ...current,
                                                        [section.title]: nextItems,
                                                      };
                                                    })
                                                  }
                                                >
                                                  <span>{item}</span>
                                                  {isSelected ? (
                                                    <Check className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={2} />
                                                  ) : null}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-4 border-t-[0.5px] border-[#E7E6E9] pt-3">
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 text-left text-[14px] leading-5 text-[#245698] transition-colors hover:text-[#1b467d]"
                                  >
                                    <Plus className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={2.2} />
                                    <span>Thêm bộ lọc</span>
                                  </button>
                                </div>
                              </div>

                              <div className="border-b-[0.5px] border-[#E7E6E9] px-5 py-4 md:border-b-0 md:border-r-[0.5px]">
                                <div className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
                                  <ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={1.9} />
                                  <span>Nhóm theo</span>
                                </div>
                                <div className="mt-4 space-y-2 text-[14px] leading-5 text-foreground">
                                  {activeSearchGroupOptions.map((item) => {
                                    const isSelected = selectedSearchGroupOptions.includes(item);

                                    return (
                                      <button
                                        key={item}
                                        type="button"
                                        className={`flex w-full items-center justify-between gap-3 text-left transition-colors hover:text-[#245698] ${
                                          isSelected ? "font-semibold" : ""
                                        }`}
                                        onClick={() =>
                                          setSelectedSearchGroupOptions((current) =>
                                            current.includes(item)
                                              ? current.filter((currentItem) => currentItem !== item)
                                              : [...current, item]
                                          )
                                        }
                                      >
                                        <span>{item}</span>
                                        {isSelected ? (
                                          <Check className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={2} />
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="mt-4 border-t-[0.5px] border-[#E7E6E9] pt-3">
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 text-left text-[14px] leading-5 text-[#245698] transition-colors hover:text-[#1b467d]"
                                  >
                                    <Plus className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={2.2} />
                                    <span>Thêm nhóm</span>
                                  </button>
                                </div>
                              </div>

                              <div className="px-5 py-4">
                                <div className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
                                  <Star className="h-4 w-4 shrink-0 text-[#245698]" strokeWidth={1.9} />
                                  <span>Yêu thích</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 lg:col-start-3">
                      {isCustomerDetailsPage && selectedCustomerRow ? (
                        <>
                          <div className="text-[14px] font-normal text-foreground">
                            {`${customerDetailIndex >= 0 ? customerDetailIndex + 1 : 0} / ${customerDetailNavigationRows.length}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => {
                                if (previousCustomerDetail) {
                                  openCustomerDetails(previousCustomerDetail.customer);
                                }
                              }}
                              disabled={!previousCustomerDetail}
                              aria-label="Khách hàng trước"
                            >
                              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => {
                                if (nextCustomerDetail) {
                                  openCustomerDetails(nextCustomerDetail.customer);
                                }
                              }}
                              disabled={!nextCustomerDetail}
                              aria-label="Khách hàng sau"
                            >
                              <ChevronRight className="h-5 w-5" strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      ) : isContractDetailsPage && selectedContractRow ? (
                        <>
                          <div className="text-[14px] font-normal text-foreground">
                            {`${contractDetailIndex >= 0 ? contractDetailIndex + 1 : 0} / ${contractDetailNavigationRows.length}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => {
                                if (previousContractDetail) {
                                  openContractDetails(previousContractDetail.code);
                                }
                              }}
                              disabled={!previousContractDetail}
                              aria-label="Hợp đồng trước"
                            >
                              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => {
                                if (nextContractDetail) {
                                  openContractDetails(nextContractDetail.code);
                                }
                              }}
                              disabled={!nextContractDetail}
                              aria-label="Hợp đồng sau"
                            >
                              <ChevronRight className="h-5 w-5" strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      ) : isServiceDetailsPage && selectedServiceDetailScope ? (
                        <>
                          <div className="text-[14px] font-normal text-foreground">
                            {`${serviceDetailIndex >= 0 ? serviceDetailIndex + 1 : 0} / ${serviceDetailNavigationRows.length}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => {
                                if (previousServiceDetail) {
                                  openServiceDetails(previousServiceDetail.service as ServicePageScope, previousServiceDetail.item);
                                }
                              }}
                              disabled={!previousServiceDetail}
                              aria-label="Loại hình dịch vụ trước"
                            >
                              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => {
                                if (nextServiceDetail) {
                                  openServiceDetails(nextServiceDetail.service as ServicePageScope, nextServiceDetail.item);
                                }
                              }}
                              disabled={!nextServiceDetail}
                              aria-label="Loại hình dịch vụ sau"
                            >
                              <ChevronRight className="h-5 w-5" strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      ) : activeListPagination ? (
                        <>
                          <div className="text-[14px] font-normal text-foreground">
                            {`${activeListRangeStart}-${activeListRangeEnd} / ${activeListPagination.total}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() => activeListPagination.setPage((current) => Math.max(1, current - 1))}
                              disabled={activeListPagination.currentPage === 1}
                              aria-label="Trang trước"
                            >
                              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white text-[#5B6BC0] transition hover:bg-[#F5F8FF] disabled:cursor-not-allowed disabled:border-[#D7D7D7] disabled:text-[#B7B7B7]"
                              onClick={() =>
                                activeListPagination.setPage((current) =>
                                  Math.min(activeListPagination.pageCount, current + 1)
                                )
                              }
                              disabled={activeListPagination.currentPage === activeListPagination.pageCount}
                              aria-label="Trang sau"
                            >
                              <ChevronRight className="h-5 w-5" strokeWidth={2} />
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              {isBookingListPage || isCustomerListPage || isCustomerContractsPage || isCustomerServicesPage ? (
                <div className="shrink-0 lg:ml-auto lg:flex lg:flex-col lg:items-end lg:gap-4">
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {!isCustomerPage ? (
                      <button
                        type="button"
                        onClick={openCreateRequest}
                        className="ui-hover-card inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground shadow-[0_1px_1.75px_rgba(0,0,0,0.05)] transition hover:border-foreground/20 hover:bg-[#fcfcfc]"
                      >
                        <Plus className="h-5 w-5" strokeWidth={1.8} />
                        <span>Tạo yêu cầu mới</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {isCustomerDetailsPage && selectedCustomerRow && !isCustomerCreateLikePage ? (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-5">
                  <div className="space-y-5">
                    <SectionCard
                      title="Tổng quan"
                      className="rounded-[16px] border-0"
                      headingIcon={
                        <DetailHeadingIcon>
                          <Info className="h-4 w-4" strokeWidth={2.2} />
                        </DetailHeadingIcon>
                      }
                      headingAction={
                        <button
                          type="button"
                          className="text-sm font-medium text-[#245698] transition-colors hover:text-[#1b467d]"
                        >
                          Chỉnh sửa
                        </button>
                      }
                    >
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <div className="text-lg font-semibold text-foreground">Thông tin cơ bản</div>
                          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Tên khách hàng</div>
                              <div className="text-base text-foreground">{selectedCustomerRow.customer}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">MST Khách hàng</div>
                              <div className="text-base text-foreground">{selectedCustomerRow.taxId}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Công ty ký hợp đồng</div>
                              <div className="text-base text-foreground">{selectedCustomerRow.contractCompany}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Dịch vụ đang sử dụng</div>
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                {selectedCustomerRow.services.map((service) => (
                                  <CustomerServiceTag key={`${selectedCustomerRow.customer}-${service}`} service={service} />
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Người liên hệ</div>
                              <div className="text-base text-foreground">{selectedCustomerRow.contactName}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Email</div>
                              <a
                                href={`mailto:${selectedCustomerRow.email}`}
                                className="inline-flex text-base text-[#245698] underline-offset-2 hover:underline"
                              >
                                {selectedCustomerRow.email}
                              </a>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Số điện thoại</div>
                              <div className="text-base text-foreground">{selectedCustomerRow.phone}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Trạng thái</div>
                              <div className="inline-flex">
                                <CustomerAccountStatusTag status={selectedCustomerRow.status} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="border-t-[0.5px] border-[#E7E6E9] pt-5">
                          <div className="text-lg font-semibold text-foreground">KPI / Summary</div>
                          <div className="mt-3 grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Tổng số shipment</div>
                              <div className="text-base text-foreground">{selectedCustomerRow.totalBookings * 3}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Tổng doanh thu</div>
                              <div className="text-base text-foreground">USD 128,500</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Số booking gần nhất</div>
                              <a
                                href={`?booking=BR-2026-${String((selectedCustomerRow.totalBookings + 4020)).padStart(4, "0")}`}
                                className="inline-flex text-base text-[#245698] underline-offset-2 hover:underline"
                                onClick={(event) => {
                                  event.preventDefault();
                                  openBookingDetails(`BR-2026-${String((selectedCustomerRow.totalBookings + 4020)).padStart(4, "0")}`);
                                }}
                              >
                                {`BR-2026-${String((selectedCustomerRow.totalBookings + 4020)).padStart(4, "0")}`}
                              </a>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Tình trạng công nợ</div>
                              <div className="text-base text-foreground">Trong hạn thanh toán</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    {selectedCustomerRow.status !== "draft" ? (
                      <>
                        <SectionCard
                          title="Hợp đồng"
                          className="rounded-[16px] border-0"
                          headingIcon={
                            <DetailHeadingIcon>
                              <FileText className="h-4 w-4" strokeWidth={2.2} />
                            </DetailHeadingIcon>
                          }
                        >
                          <div className="overflow-hidden rounded-[16px] bg-card">
                            <div className="grid grid-cols-[1fr_1.35fr_1fr_0.8fr] items-center gap-4 bg-background px-4 py-4 text-base font-medium text-muted-foreground">
                              {["Mã hợp đồng", "Loại hợp đồng", "Thời hạn", "Trạng thái hợp đồng"].map((label) => (
                                <div
                                  key={label}
                                  className="text-left"
                                >
                                  {label}
                                </div>
                              ))}
                            </div>
                            {selectedCustomerContracts.map((contract) => (
                              <div
                                key={contract.code}
                                className="grid cursor-pointer grid-cols-[1fr_1.35fr_1fr_0.8fr] items-center gap-4 border-t border-[#E7E6E9] px-4 py-3 text-base transition-colors hover:bg-[#B6E1FF]"
                                role="button"
                                tabIndex={0}
                                onClick={() => openContractDetails(contract.code)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openContractDetails(contract.code);
                                  }
                                }}
                              >
                                <div className="text-foreground">
                                  <span className="inline-flex items-center font-semibold text-foreground">{contract.code}</span>
                                </div>
                                <div className="text-foreground">
                                  {contract.contractType}
                                </div>
                                <div className="text-foreground">
                                  {contract.term}
                                </div>
                                <div className="text-foreground">
                                  {contractStatusMeta[contract.status].label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </SectionCard>

                        <SectionCard
                          title="Danh sách Shipment"
                          className="rounded-[16px] border-0"
                          headingIcon={
                            <DetailHeadingIcon>
                              <Package className="h-4 w-4" strokeWidth={2.2} />
                            </DetailHeadingIcon>
                          }
                        >
                          <div className="overflow-hidden rounded-[16px] bg-card">
                            <div className="grid grid-cols-[1.05fr_1.35fr_0.9fr_0.8fr] items-center gap-4 bg-background px-6 py-4 text-base font-medium text-muted-foreground">
                              {["Mã booking", "Tuyến vận chuyển", "Trạng thái Shipment", "Ngày tạo"].map((label) => (
                                <div key={label} className="text-left">
                                  {label}
                                </div>
                              ))}
                            </div>
                            {visibleCustomerShipmentRows.map((row) => (
                              <div
                                key={row.code}
                                className="grid cursor-pointer grid-cols-[1.05fr_1.35fr_0.9fr_0.8fr] items-center gap-4 border-t border-[#E7E6E9] px-6 py-3 text-base transition-colors hover:bg-[#B6E1FF]"
                                role="button"
                                tabIndex={0}
                                onClick={() => openBookingDetails(row.code)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openBookingDetails(row.code);
                                  }
                                }}
                              >
                                <div className="text-foreground">
                                  <span className="inline-flex items-center font-semibold text-foreground">{row.code}</span>
                                </div>
                                <div className="text-foreground">
                                  <RouteCell {...row.route} className="text-base" />
                                </div>
                                <div className="text-foreground">
                                  <BookingStatusTag status={row.status} />
                                </div>
                                <div className="text-foreground">{row.createdAt}</div>
                              </div>
                            ))}
                            {customerShipmentRows.length > customerShipmentPageSize ? (
                              <div className="mt-4 flex items-center justify-center px-6 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cbccc9] bg-card text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => setCustomerShipmentPage((current) => Math.max(1, current - 1))}
                                    disabled={customerShipmentPage === 1}
                                  >
                                    {"<"}
                                  </button>
                                  {Array.from({ length: customerShipmentPageCount }, (_, index) => index + 1).map((page) => (
                                    <button
                                      key={page}
                                      type="button"
                                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                                        page === customerShipmentPage
                                          ? "bg-[#7A7A7A] text-white"
                                          : "border border-[#cbccc9] bg-card text-foreground hover:bg-background"
                                      }`}
                                      onClick={() => setCustomerShipmentPage(page)}
                                    >
                                      {page}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cbccc9] bg-card text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() =>
                                      setCustomerShipmentPage((current) => Math.min(customerShipmentPageCount, current + 1))
                                    }
                                    disabled={customerShipmentPage === customerShipmentPageCount}
                                  >
                                    {">"}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </SectionCard>
                      </>
                    ) : null}

                    <SectionCard
                      title="Ghi chú nội bộ"
                      className="rounded-[16px] border-0"
                      headingIcon={
                        <DetailHeadingIcon>
                          <Pencil className="h-4 w-4" strokeWidth={2.2} />
                        </DetailHeadingIcon>
                      }
                    >
                      <div className="space-y-3">
                        <textarea
                          value={customerDetailNote}
                          onChange={(event) => setCustomerDetailNote(event.target.value)}
                          placeholder="Nhập ghi chú nội bộ cho khách hàng"
                          className="min-h-[96px] w-full rounded-2xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                        />
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-full bg-[#245698] px-3 text-sm font-medium text-white transition-colors hover:bg-[#1d467d]"
                        >
                          Gửi đi
                        </button>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Lịch sử tác động"
                      className="rounded-[16px] border-0"
                      headingIcon={
                        <DetailHeadingIcon>
                          <History className="h-4 w-4" strokeWidth={2.2} />
                        </DetailHeadingIcon>
                      }
                    >
                      <div className="space-y-4">
                        {customerHistoryEntries.map((entry, index) => (
                          <div
                            key={`${entry.title}-${index}`}
                            className={`flex gap-3 ${index === 0 ? "" : "border-t-[0.5px] border-[#E7E6E9] pt-4"}`}
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7E6E9] text-sm font-medium text-foreground">
                              AP
                            </div>
                            <div>
                              <div className="text-base font-medium text-foreground">{entry.title}</div>
                              <div className="mt-1 text-sm text-muted-foreground">{entry.meta}</div>
                              <div className="mt-2 text-sm text-foreground">{entry.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                </div>
              </div>
            ) : isContractDetailsPage && selectedContractRow ? (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-5">
                  <SectionCard
                    title="Tổng quan hợp đồng"
                    className="rounded-[16px] border-0"
                    headingIcon={
                      <DetailHeadingIcon>
                        <Info className="h-4 w-4" strokeWidth={2.2} />
                      </DetailHeadingIcon>
                    }
                    headingAction={
                      <button
                        type="button"
                        className="text-sm font-medium text-[#245698] transition-colors hover:text-[#1b467d]"
                      >
                        Chỉnh sửa
                      </button>
                    }
                  >
                    <div className="space-y-5">
                      <div>
                        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Mã hợp đồng</div>
                            <div className="text-base text-foreground">{selectedContractRow.code}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Khách hàng</div>
                            <button
                              type="button"
                              onClick={() => openCustomerDetails(selectedContractRow.customer)}
                              className="flex justify-start text-left text-base text-[#245698] underline-offset-2 hover:underline"
                            >
                              {selectedContractRow.customer}
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Công ty ký hợp đồng</div>
                            <div className="text-base text-foreground">{selectedContractRow.contractCompany}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Trạng thái hợp đồng</div>
                            <div className="inline-flex">
                              <ContractStatusTag status={selectedContractRow.status} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Dịch vụ</div>
                            <div className="text-base text-foreground">{formatContractServiceLabels(selectedContractRow.services)}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Loại hợp đồng</div>
                            <div className="text-base text-foreground">{selectedContractRow.contractType}</div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Ngày ký</div>
                            <div className="text-base text-foreground">
                              {selectedContractRow.status === "draft" ? "-" : selectedContractRow.signedAt}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-base font-medium text-muted-foreground">Ngày hết hạn</div>
                            <div className={`text-base ${selectedContractRow ? getContractExpiryTextClass(selectedContractRow) : "text-foreground"}`}>
                              {selectedContractExpiry}
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Hợp đồng scan"
                    description="Tải lên bản scan hợp đồng để lưu trữ và đối soát nội bộ."
                    className="rounded-[16px] border-0"
                    headingIcon={
                      <DetailHeadingIcon>
                        <FileText className="h-4 w-4" strokeWidth={2.2} />
                      </DetailHeadingIcon>
                    }
                  >
                    <div className="space-y-2">
                      <div className="text-base font-medium text-muted-foreground">Tệp đính kèm hợp đồng</div>
                      <input
                        ref={contractScanInputRef}
                        type="file"
                        accept="application/pdf,.pdf,image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }
                          const nextUrl = URL.createObjectURL(file);
                          setContractScanFileName(file.name);
                          setContractScanFileUrl(nextUrl);
                          setContractScanUpdatedAt(formatDateTimeDisplay(new Date()));
                        }}
                      />
                      {contractScanFileName && contractScanFileUrl ? (
                        <div className="rounded-2xl border border-[#D9D9E1] bg-card px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                              <a
                                href={contractScanFileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-0 items-center gap-2 text-base text-[#245698] underline-offset-2 hover:underline"
                              >
                                <FileText className="h-5 w-5 shrink-0 text-[#245698]" strokeWidth={1.8} />
                                <span className="truncate font-semibold">{contractScanFileName}</span>
                              </a>
                              <div className="shrink-0 text-sm text-muted-foreground">
                                Cập nhật lúc: {contractScanUpdatedAt}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setContractScanFileName("");
                                setContractScanFileUrl("");
                                setContractScanUpdatedAt("");
                              }}
                              className="text-sm font-medium text-[#245698] transition-colors hover:text-[#1b467d]"
                            >
                              Cập nhật
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => contractScanInputRef.current?.click()}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            const file = event.dataTransfer.files?.[0];
                            if (!file) {
                              return;
                            }
                            const nextUrl = URL.createObjectURL(file);
                            setContractScanFileName(file.name);
                            setContractScanFileUrl(nextUrl);
                            setContractScanUpdatedAt(formatDateTimeDisplay(new Date()));
                          }}
                          className="flex min-h-[104px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9D9E1] bg-card px-6 text-center text-base text-muted-foreground transition hover:border-border hover:bg-[#FCFCFC]"
                        >
                          <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.8} />
                          <div className="mt-3">Kéo thả hoặc nhấn để tải file scan hợp đồng</div>
                        </button>
                      )}
                    </div>
                  </SectionCard>

                  {selectedContractRow.status !== "draft" ? (
                    <>
                      <SectionCard
                        title="Danh sách Shipment theo hợp đồng"
                        className="rounded-[16px] border-0"
                        headingIcon={
                          <DetailHeadingIcon>
                            <Package className="h-4 w-4" strokeWidth={2.2} />
                          </DetailHeadingIcon>
                        }
                      >
                        <div className="overflow-hidden rounded-[16px] bg-card">
                          <div className="grid grid-cols-[1.05fr_1.35fr_0.9fr_0.8fr] items-center gap-4 bg-background px-6 py-4 text-base font-medium text-muted-foreground">
                            {["Mã booking", "Tuyến vận chuyển", "Trạng thái Shipment", "Ngày tạo"].map((label) => (
                              <div key={label} className="text-left">
                                {label}
                              </div>
                            ))}
                          </div>
                          {contractDetailShipmentRows.length > 0 ? (
                            contractDetailShipmentRows.map((row) => (
                              <div
                                key={row.code}
                                className="grid cursor-pointer grid-cols-[1.05fr_1.35fr_0.9fr_0.8fr] items-center gap-4 border-t border-[#E7E6E9] px-6 py-3 text-base transition-colors hover:bg-[#B6E1FF]"
                                role="button"
                                tabIndex={0}
                                onClick={() => openBookingDetails(row.code)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    openBookingDetails(row.code);
                                  }
                                }}
                              >
                                <div className="text-foreground">
                                  <span className="inline-flex items-center font-semibold text-foreground">{row.code}</span>
                                </div>
                                <div className="text-foreground">
                                  <RouteCell {...row.route} className="text-base" />
                                </div>
                                <div className="text-foreground">
                                  <BookingStatusTag status={row.status} />
                                </div>
                                <div className="text-foreground">{row.createdAt}</div>
                              </div>
                            ))
                          ) : (
                            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                              Không có shipment liên quan đến hợp đồng này.
                            </div>
                          )}
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Bảng giá theo hợp đồng"
                        className="rounded-[16px] border-0"
                        headingIcon={
                          <DetailHeadingIcon>
                            <BadgeDollarSign className="h-4 w-4" strokeWidth={2.2} />
                          </DetailHeadingIcon>
                        }
                      >
                        <div className="overflow-hidden rounded-[16px] bg-card">
                          <div className="grid grid-cols-[1.35fr_0.95fr_0.8fr_1fr_0.8fr] items-center gap-4 bg-background px-6 py-4 text-base font-medium text-muted-foreground">
                            {["Tuyến vận chuyển", "Loại container", "Giá", "Thời gian cập nhật giá", "Thao tác"].map((label) => (
                              <div key={label} className="text-left">
                                {label}
                              </div>
                            ))}
                          </div>
                          {[
                            { route: "TP.HCM → Rotterdam", container: "20' Dry", price: "USD 1,250", updatedAt: "18/03/2026 09:15" },
                            { route: "Hải Phòng → Busan", container: "40' HC", price: "USD 1,780", updatedAt: "19/03/2026 14:20" },
                            { route: "Vũng Tàu → Dubai", container: "40' Reefer", price: "USD 2,340", updatedAt: "20/03/2026 08:40" }
                          ].map((rate, index) => (
                            <div
                              key={`${rate.route}-${rate.container}`}
                              className={`grid grid-cols-[1.35fr_0.95fr_0.8fr_1fr_0.8fr] items-center gap-4 px-6 py-3 text-base transition-colors hover:bg-[#B6E1FF] ${
                                index === 0 ? "border-t border-[#E7E6E9]" : "border-t border-[#E7E6E9]"
                              }`}
                            >
                              <div className="text-foreground">
                                <span className="inline-flex items-center font-medium text-foreground">{rate.route}</span>
                              </div>
                              <div className="text-foreground">{rate.container}</div>
                              <div className="text-foreground">{rate.price}</div>
                              <div className="text-foreground">{rate.updatedAt}</div>
                              <div className="flex items-center gap-4">
                                <button
                                  type="button"
                                  className="text-sm font-medium text-[#245698] transition-colors hover:text-[#1b467d]"
                                >
                                  Cập nhật giá
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    </>
                  ) : null}

                </div>
              </div>
            ) : selectedBookingRow ? (
              <div
                ref={detailsScrollRef}
                className={`mt-5 pr-1 ${isCreatePage ? "min-h-fit overflow-visible" : "min-h-0 flex-1 overflow-y-auto"}`}
              >
                <div className="space-y-5">
                  <div ref={detailsIntroCardRef} className="rounded-[16px] bg-card p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-2xl font-semibold text-foreground">{`Mã yêu cầu: ${selectedBookingRow.code}`}</div>
                          {!showStickyDetailsStatus ? <BookingStatusTag status={selectedBookingRow.status} /> : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {isCreatePage
                            ? `Yêu cầu Booking bởi PI's Operator - Admin PI Logistics — Ngày tạo: ${selectedBookingRow.createdAt}`
                            : `Yêu cầu Booking từ khách hàng — Ngày tạo: ${selectedBookingRow.createdAt}`}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                          {isCanceledBooking ? (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Lý do hủy:</span>{" "}
                              {selectedCancelReason}
                            </div>
                          ) : isConfirmedBooking ? (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Trạng thái:</span>{" "}
                              {selectedAcceptedMessage}
                            </div>
                          ) : selectedBookingRow.status === "draft" ? (
                            <>
                              <button className="inline-flex h-11 items-center rounded-full bg-[#22579B] px-5 text-sm font-medium text-white">
                                <span>Lưu nháp</span>
                              </button>
                              <button className="inline-flex h-11 items-center rounded-full bg-[#22579B] px-5 text-sm font-medium text-white">
                                <span>Gửi yêu cầu Booking</span>
                              </button>
                              <button className="ui-hover-card inline-flex h-10 items-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground shadow-[0_1px_1.75px_rgba(0,0,0,0.05)] transition hover:border-foreground/20 hover:bg-[#fcfcfc]">
                                Đính kèm tài liệu
                              </button>
                            </>
                          ) : (
                            <>
                              {selectedBookingRow.status !== "pending" ? (
                                <button className="inline-flex h-11 items-center rounded-full bg-[#22579B] px-5 text-sm font-medium text-white">
                                  <span>Liên hệ hãng tàu</span>
                                </button>
                              ) : null}
                              <button className="inline-flex h-11 items-center rounded-full bg-[#22579B] px-5 text-sm font-medium text-white">
                                <span>Xác nhận Booking</span>
                              </button>
                              <button className="ui-hover-card inline-flex h-10 items-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground shadow-[0_1px_1.75px_rgba(0,0,0,0.05)] transition hover:border-foreground/20 hover:bg-[#fcfcfc]">
                                Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="xl:flex xl:justify-end">
                        <BookingStatusProgress
                          status={selectedBookingRow.status}
                          includeCanceled={!isCreatePage}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                      <SectionCard
                        title="Thông tin Chung & Liên kết"
                        description="Thông tin tổng quan phục vụ CS, pricing và bộ phận điều vận."
                        className="rounded-[16px] border-0"
                        headingIcon={
                          <DetailHeadingIcon>
                            <Info className="h-4 w-4" strokeWidth={2.2} />
                          </DetailHeadingIcon>
                        }
                      >
                        {isCreatePage ? (
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Khách hàng</div>
                              <div ref={customerSearchRef} className="relative">
                                <input
                                  value={generalInfoForm.customer}
                                  placeholder="Nhập tên khách hàng"
                                  onFocus={() => setIsCustomerSearchOpen(true)}
                                  onChange={(event) => {
                                    const nextCustomer = event.target.value;
                                    setGeneralInfoForm((current) => ({
                                      ...current,
                                      customer: nextCustomer
                                    }));
                                    setIsCustomerSearchOpen(true);
                                  }}
                                  className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                />
                                {isCustomerSearchOpen ? (
                                  <div className="absolute left-0 right-0 top-full z-30 overflow-hidden rounded-[16px] border border-[#E7E6E9] bg-white shadow-[0_18px_48px_rgba(17,17,17,0.12)]">
                                    <div className="max-h-72 overflow-y-auto">
                                      {customerDropdownOptions.length > 0 ? (
                                        customerDropdownOptions.map((option, optionIndex) => (
                                          <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => selectCreateCustomer(option.value)}
                                            className={`flex w-full items-start px-4 py-2.5 text-left text-base text-foreground transition hover:bg-[#F7F7F5] ${
                                              optionIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                            }`}
                                            style={optionIndex === 0 ? undefined : { borderTopWidth: "0.5px" }}
                                          >
                                            <span className="line-clamp-2">{option.label}</span>
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-4 py-3 text-sm text-muted-foreground">
                                          Không tìm thấy khách hàng phù hợp
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Liên kết báo giá (Linked Quote)</div>
                              <div className="relative">
                                <select
                                  value={generalInfoForm.linkedQuote}
                                  onChange={(event) =>
                                    setGeneralInfoForm((current) => ({
                                      ...current,
                                      linkedQuote: event.target.value
                                    }))
                                  }
                                  className="min-h-[46px] w-full appearance-none rounded-2xl border border-input bg-card px-4 pr-10 text-base text-foreground outline-none transition focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                >
                                  <option value="">Chọn mã Liên kết báo giá</option>
                                  {createQuoteOptions.map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                  strokeWidth={1.8}
                                />
                              </div>
                              {generalInfoForm.linkedQuote ? (
                                <button
                                  type="button"
                                  className="text-sm font-medium text-[#2054A3] transition hover:underline"
                                >
                                  Xem liên kết báo giá
                                </button>
                              ) : null}
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">All-in Rate ước tính</div>
                              <input
                                value={generalInfoForm.estimatedRate}
                                placeholder="USD x"
                                disabled
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground/80 outline-none disabled:cursor-not-allowed"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Người liên hệ</div>
                              <input
                                value={generalInfoForm.contactName}
                                placeholder="Nhập tên người liên hệ"
                                onChange={(event) =>
                                  setGeneralInfoForm((current) => ({
                                    ...current,
                                    contactName: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Email</div>
                              <input
                                value={generalInfoForm.email}
                                placeholder="Nhập email người liên hệ"
                                onChange={(event) =>
                                  setGeneralInfoForm((current) => ({
                                    ...current,
                                    email: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Số điện thoại</div>
                              <input
                                value={generalInfoForm.phone}
                                placeholder="Nhập số điện thoại"
                                onChange={(event) =>
                                  setGeneralInfoForm((current) => ({
                                    ...current,
                                    phone: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Khách hàng</div>
                              <button
                                type="button"
                                onClick={() => openCustomerDetails(selectedBookingRow.customer)}
                                className="flex w-full justify-start text-left text-base text-[#245698] underline-offset-2 transition hover:underline"
                              >
                                {selectedBookingRow.customer}
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Liên kết báo giá (Linked Quote)</div>
                              <a
                                href="#"
                                className="inline-flex items-center gap-1 text-base text-[#245698] underline-offset-2 hover:underline"
                              >
                                <span>{selectedBookingQuoteCode}</span>
                                <span aria-hidden="true">↗</span>
                              </a>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">All-in Rate ước tính</div>
                              <div className="text-base text-foreground">USD 3,217.00</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Người liên hệ</div>
                              <div className="text-base text-foreground">{selectedBookingContactName}</div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Email</div>
                              <a
                                href={`mailto:${selectedBookingContactEmail}`}
                                className="inline-flex text-base text-[#245698] underline-offset-2 hover:underline"
                              >
                                {selectedBookingContactEmail}
                              </a>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Số điện thoại</div>
                              <div className="text-base text-foreground">{selectedBookingContactPhone}</div>
                            </div>
                          </div>
                        )}
                      </SectionCard>

                      <SectionCard
                        title="Chi tiết Lộ trình & Lịch trình"
                        description="Kế thừa từ yêu cầu khách hàng và cập nhật theo lịch tàu thực tế của hãng."
                        className="rounded-[16px] border-0"
                        headingIcon={
                          <DetailHeadingIcon>
                            <Route className="h-4 w-4" strokeWidth={2.2} />
                          </DetailHeadingIcon>
                        }
                      >
                        <div className="space-y-5">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">POL (Cảng đi)</div>
                              {isCreatePage ? (
                                <div ref={originPortSearchRef} className="relative">
                                  <input
                                    value={routeScheduleForm.originPort}
                                    placeholder="Tìm theo tên cảng hoặc mã cảng"
                                    disabled={isDetailsReadOnly}
                                    onFocus={() => setOpenRoutePortMenu("origin")}
                                    onChange={(event) =>
                                      setRouteScheduleForm((current) => ({
                                        ...current,
                                        originPort: event.target.value
                                      }))
                                    }
                                    className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                  />
                                  {openRoutePortMenu === "origin" ? (
                                    <div className="absolute left-0 right-0 top-full z-20 max-h-56 overflow-y-auto rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                      {originPortDropdownOptions.slice(0, 8).length > 0 ? (
                                        originPortDropdownOptions.slice(0, 8).map((option, optionIndex) => (
                                          <button
                                            key={`origin-${option.code}`}
                                            type="button"
                                            className={`flex w-full items-center px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-[#F7F7F5] ${
                                              optionIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                            }`}
                                            style={optionIndex === 0 ? undefined : { borderTopWidth: "0.5px" }}
                                            onClick={() => selectRoutePort("origin", option.label)}
                                          >
                                            {option.label}
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-4 py-3 text-sm text-muted-foreground">
                                          Không tìm thấy cảng phù hợp
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <input
                                  value={formatPortScheduleValue(selectedBookingRow.route.from)}
                                  disabled
                                  className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground/80 outline-none disabled:cursor-not-allowed"
                                />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Loại địa điểm (Origin)</div>
                              <div className="relative">
                                <select
                                  value={routeScheduleForm.originLocationType}
                                  disabled={isDetailsReadOnly}
                                  onChange={(event) =>
                                    setRouteScheduleForm((current) => ({
                                      ...current,
                                      originLocationType: event.target.value
                                    }))
                                  }
                                  className="min-h-[46px] w-full appearance-none rounded-2xl border border-input bg-card px-4 pr-10 text-base text-foreground outline-none transition disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                >
                                  <option value="Ramp (CY)">Ramp (CY)</option>
                                  <option value="Door">Door</option>
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                  strokeWidth={1.8}
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">POD (Cảng đến)</div>
                              {isCreatePage ? (
                                <div ref={destinationPortSearchRef} className="relative">
                                  <input
                                    value={routeScheduleForm.destinationPort}
                                    placeholder="Tìm theo tên cảng hoặc mã cảng"
                                    disabled={isDetailsReadOnly}
                                    onFocus={() => setOpenRoutePortMenu("destination")}
                                    onChange={(event) =>
                                      setRouteScheduleForm((current) => ({
                                        ...current,
                                        destinationPort: event.target.value
                                      }))
                                    }
                                    className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                  />
                                  {openRoutePortMenu === "destination" ? (
                                    <div className="absolute left-0 right-0 top-full z-20 max-h-56 overflow-y-auto rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                      {destinationPortDropdownOptions.slice(0, 8).length > 0 ? (
                                        destinationPortDropdownOptions.slice(0, 8).map((option, optionIndex) => (
                                          <button
                                            key={`destination-${option.code}`}
                                            type="button"
                                            className={`flex w-full items-center px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-[#F7F7F5] ${
                                              optionIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                            }`}
                                            style={optionIndex === 0 ? undefined : { borderTopWidth: "0.5px" }}
                                            onClick={() => selectRoutePort("destination", option.label)}
                                          >
                                            {option.label}
                                          </button>
                                        ))
                                      ) : (
                                        <div className="px-4 py-3 text-sm text-muted-foreground">
                                          Không tìm thấy cảng phù hợp
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <input
                                  value={formatPortScheduleValue(selectedBookingRow.route.to)}
                                  disabled
                                  className="min-h-[46px] w-full rounded-2xl border border-input bg-background px-4 text-base text-foreground/80 outline-none disabled:cursor-not-allowed"
                                />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Loại địa điểm (Dest)</div>
                              <div className="relative">
                                <select
                                  value={routeScheduleForm.destinationLocationType}
                                  disabled={isDetailsReadOnly}
                                  onChange={(event) =>
                                    setRouteScheduleForm((current) => ({
                                      ...current,
                                      destinationLocationType: event.target.value
                                    }))
                                  }
                                  className="min-h-[46px] w-full appearance-none rounded-2xl border border-input bg-card px-4 pr-10 text-base text-foreground outline-none transition disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                >
                                  <option value="Ramp (CY)">Ramp (CY)</option>
                                  <option value="Door">Door</option>
                                </select>
                                <ChevronDown
                                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                  strokeWidth={1.8}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Tên tàu (Vessel)</div>
                              <input
                                value={routeScheduleForm.vesselName}
                                placeholder="Nhập tên tàu"
                                disabled={isDetailsReadOnly}
                                onChange={(event) =>
                                  setRouteScheduleForm((current) => ({
                                    ...current,
                                    vesselName: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">Số chuyến (Voyage)</div>
                              <input
                                value={routeScheduleForm.voyage}
                                placeholder="Nhập số chuyến"
                                disabled={isDetailsReadOnly}
                                onChange={(event) =>
                                  setRouteScheduleForm((current) => ({
                                    ...current,
                                    voyage: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">ETD (Ngày khởi hành dự kiến)</div>
                              <input
                                type="date"
                                value={routeScheduleForm.etd}
                                placeholder="dd/mm/yyyy"
                                disabled={isDetailsReadOnly}
                                onClick={openNativeDatePicker}
                                onFocus={openNativeDatePicker}
                                onChange={(event) =>
                                  setRouteScheduleForm((current) => ({
                                    ...current,
                                    etd: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-base font-medium text-muted-foreground">ETA (Ngày đến dự kiến)</div>
                              <input
                                type="date"
                                value={routeScheduleForm.eta}
                                placeholder="dd/mm/yyyy"
                                disabled={isDetailsReadOnly}
                                onClick={openNativeDatePicker}
                                onFocus={openNativeDatePicker}
                                onChange={(event) =>
                                  setRouteScheduleForm((current) => ({
                                    ...current,
                                    eta: event.target.value
                                  }))
                                }
                                className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard
                        title="Chi tiết Hàng hóa & Thiết bị"
                        description="Khai báo container, số lượng, trọng lượng và mô tả hàng hóa theo từng dòng thiết bị."
                        className="rounded-[16px] border-0"
                        headingIcon={
                          <DetailHeadingIcon>
                            <Boxes className="h-4 w-4" strokeWidth={2.2} />
                          </DetailHeadingIcon>
                        }
                      >
                        <div className="overflow-hidden rounded-[16px] bg-card">
                          <div className="grid grid-cols-[40px_1.25fr_0.9fr_1.1fr_1.15fr_1.6fr_40px] items-center gap-4 bg-background px-4 py-4 text-base font-medium text-muted-foreground">
                            <div className="text-left">#</div>
                            <div className="text-left">Loại & Kích thước</div>
                            <div className="text-left">Số lượng</div>
                            <div className="text-left">Trọng lượng</div>
                            <div className="text-left">Phân loại (Commodity)</div>
                            <div className="text-left">Mô tả hàng</div>
                            <div />
                          </div>
                          {equipmentRows.map((item, index) => (
                            <div
                              key={`equipment-row-${selectedBookingCode}-${index}`}
                              className={`grid grid-cols-[40px_1.25fr_0.9fr_1.1fr_1.15fr_1.6fr_40px] items-center gap-4 px-4 py-3 ${
                                index === equipmentRows.length - 1 ? "" : "border-t border-[#E7E6E9]"
                              }`}
                            >
                              <div className="text-base text-muted-foreground">{index + 1}</div>
                              <div className="relative">
                                <select
                                  value={item.equipment}
                                  disabled={isDetailsReadOnly}
                                  onChange={(event) =>
                                    setEquipmentRows((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, equipment: event.target.value } : row
                                      )
                                    )
                                  }
                                  className="min-h-[40px] w-full appearance-none rounded-xl border border-input bg-white px-4 pr-10 text-base text-foreground outline-none transition disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                >
                                  <option value="">Chọn loại & kích thước</option>
                                  {["20' Dry", "40' HC", "40' Reefer", "45' HC"].map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                              <input
                                value={item.quantity}
                                placeholder="Nhập số lượng"
                                disabled={isDetailsReadOnly}
                                onChange={(event) =>
                                  setEquipmentRows((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index ? { ...row, quantity: event.target.value } : row
                                    )
                                  )
                                }
                                className="min-h-[40px] w-full rounded-xl border border-input bg-white px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                              <input
                                value={item.weight}
                                placeholder="Nhập trọng lượng"
                                disabled={isDetailsReadOnly}
                                onChange={(event) =>
                                  setEquipmentRows((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index ? { ...row, weight: event.target.value } : row
                                    )
                                  )
                                }
                                className="min-h-[40px] w-full rounded-xl border border-input bg-white px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                              <div className="relative">
                                <select
                                  value={item.commodity}
                                  disabled={isDetailsReadOnly}
                                  onChange={(event) =>
                                    setEquipmentRows((current) =>
                                      current.map((row, rowIndex) =>
                                        rowIndex === index ? { ...row, commodity: event.target.value } : row
                                      )
                                    )
                                  }
                                  className="min-h-[40px] w-full appearance-none rounded-xl border border-input bg-white px-4 pr-10 text-base text-foreground outline-none transition disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                >
                                  <option value="">Chọn phân loại hàng</option>
                                  {["Dry", "Reefer", "Dangerous", "Oversized"].map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                              <input
                                value={item.description}
                                placeholder="Nhập mô tả hàng"
                                disabled={isDetailsReadOnly}
                                onChange={(event) =>
                                  setEquipmentRows((current) =>
                                    current.map((row, rowIndex) =>
                                      rowIndex === index ? { ...row, description: event.target.value } : row
                                    )
                                  )
                                }
                                className="min-h-[40px] w-full rounded-xl border border-input bg-white px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                              />
                              <button
                                type="button"
                                aria-label={`Xóa dòng ${index + 1}`}
                                disabled={isDetailsReadOnly}
                                onClick={() =>
                                  setEquipmentRows((current) =>
                                    current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index)
                                  )
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#F7F7F5] hover:text-[#F33233]"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={isDetailsReadOnly}
                            onClick={() =>
                              setEquipmentRows((current) => [
                                ...current,
                                createEmptyEquipmentRow()
                              ])
                            }
                            className="flex items-center gap-2 px-4 pb-4 pt-2 text-base font-semibold text-[#245698] transition disabled:cursor-not-allowed disabled:opacity-40 hover:opacity-80"
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.4} />
                            <span>Thêm dòng</span>
                          </button>
                        </div>
                      </SectionCard>

                      {isCreatePage ? (
                        <SectionCard
                          title="Dịch vụ bổ sung (Value-Added Services)"
                          description="Tích hợp các giải pháp logistics trọn gói theo mô hình của Maersk."
                          className="rounded-[16px] border-0"
                          headingIcon={
                            <DetailHeadingIcon>
                              <ShieldPlus className="h-4 w-4" strokeWidth={2.2} />
                            </DetailHeadingIcon>
                          }
                        >
                          <div className="overflow-hidden rounded-[16px] bg-card">
                            <div className="grid gap-6 px-5 py-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
                              <div>
                                <div className="text-base font-semibold text-foreground">
                                  Vận chuyển nội địa (Inland Transport)
                                </div>
                                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                  Tùy chọn kéo container từ kho đến cảng hoặc ngược lại.
                                </div>
                              </div>
                              <label
                                className={`flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#E7E6E9] px-4 py-4 transition-colors hover:bg-[#B6E1FF] ${
                                  valueAddedServicesForm.inlandTransport ? "bg-[#B6E1FF]" : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={valueAddedServicesForm.inlandTransport}
                                  onChange={(event) =>
                                    setValueAddedServicesForm((current) => ({
                                      ...current,
                                      inlandTransport: event.target.checked
                                    }))
                                  }
                                  className="mt-1 h-4 w-4 rounded border-input text-[#22579B] focus:ring-[#22579B]"
                                />
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                                  <div className="text-base text-foreground">Bình Dương → Cát Lái</div>
                                  <div className="shrink-0 text-base font-medium text-foreground">Chi phí: USD 120 / container</div>
                                </div>
                              </label>
                            </div>

                            <div className="border-t border-[#E7E6E9]" style={{ borderTopWidth: "0.5px" }}>
                              <div className="grid gap-6 px-5 py-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
                                <div>
                                  <div className="text-base font-semibold text-foreground">
                                    Dịch vụ hải quan (Customs Services)
                                  </div>
                                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Tùy chọn hỗ trợ khai báo hải quan tại POL/POD.
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {customsServicePackages.map((service) => {
                                    const isChecked = valueAddedServicesForm.customsServices.includes(service.id);
                                    return (
                                      <label
                                        key={service.id}
                                        className={`flex cursor-pointer items-center justify-between gap-4 rounded-[12px] border border-[#E7E6E9] px-4 py-3 transition-colors hover:bg-[#B6E1FF] ${
                                          isChecked ? "bg-[#B6E1FF]" : ""
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                              setValueAddedServicesForm((current) => ({
                                                ...current,
                                                customsServices: isChecked
                                                  ? current.customsServices.filter((item) => item !== service.id)
                                                  : [...current.customsServices, service.id]
                                              }))
                                            }
                                            className="h-4 w-4 rounded border-input text-[#22579B] focus:ring-[#22579B]"
                                          />
                                          <span className="text-base text-foreground">{service.name}</span>
                                        </div>
                                        <span className="shrink-0 text-base font-medium text-foreground">
                                          {`Chi phí: ${service.price}`}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-[#E7E6E9]" style={{ borderTopWidth: "0.5px" }}>
                              <div className="grid gap-6 px-5 py-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
                                <div>
                                  <div className="text-base font-semibold text-foreground">
                                    Bảo hiểm / Bảo vệ hàng hóa (Value Protect)
                                  </div>
                                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Lựa chọn các gói bảo vệ hàng hóa khỏi rủi ro.
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {valueProtectPackages.map((service) => {
                                    const isChecked = valueAddedServicesForm.valueProtect.includes(service.id);
                                    return (
                                      <label
                                        key={service.id}
                                        className={`flex cursor-pointer items-start justify-between gap-4 rounded-[12px] border border-[#E7E6E9] px-4 py-3 transition-colors hover:bg-[#B6E1FF] ${
                                          isChecked ? "bg-[#B6E1FF]" : ""
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() =>
                                              setValueAddedServicesForm((current) => ({
                                                ...current,
                                                valueProtect: isChecked
                                                  ? current.valueProtect.filter((item) => item !== service.id)
                                                  : [...current.valueProtect, service.id]
                                              }))
                                            }
                                            className="mt-1 h-4 w-4 rounded border-input text-[#22579B] focus:ring-[#22579B]"
                                          />
                                          <div>
                                            <div className="text-base text-foreground">{service.name}</div>
                                            <div className="mt-1 text-sm leading-6 text-muted-foreground">
                                              {service.description}
                                            </div>
                                          </div>
                                        </div>
                                        <span className="shrink-0 text-base font-medium text-foreground">
                                          {`Chi phí: ${service.price}`}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </SectionCard>
                      ) : null}

                      <SectionCard
                        title="Bảng kê chi tiết chi phí"
                        description="Hiển thị các cấu phần giá để đối chiếu ocean freight, phụ phí và chi phí local theo booking."
                        className="rounded-[16px] border-0"
                        headingIcon={
                          <DetailHeadingIcon>
                            <BadgeDollarSign className="h-4 w-4" strokeWidth={2.2} />
                          </DetailHeadingIcon>
                        }
                      >
                        <div className="overflow-hidden rounded-[16px] bg-card">
                          <div className="grid grid-cols-[1.1fr_2.1fr_0.9fr_0.8fr_0.8fr_0.5fr] items-center gap-4 bg-background px-4 py-4 text-base font-medium text-muted-foreground">
                            <div>Nhóm</div>
                            <div>Mô tả phí</div>
                            <div>Đơn vị</div>
                            <div className="text-right">Rate 20'</div>
                            <div className="text-right">Rate 40'</div>
                            <div>Tiền tệ</div>
                          </div>
                          {priceBreakdownRows.map((row, index) => (
                            <div
                              key={`${row.group}-${row.detail}`}
                              className={`grid grid-cols-[1.1fr_2.1fr_0.9fr_0.8fr_0.8fr_0.5fr] items-center gap-4 px-4 py-3 text-base ${
                                index === 0 ? "border-t border-[#E7E6E9]" : "border-t border-[#E7E6E9]"
                              }`}
                            >
                              <div className="font-medium text-foreground">{row.group}</div>
                              <div className="text-foreground">{row.detail}</div>
                              <div className="text-muted-foreground">{row.unit}</div>
                              <div className="text-right text-foreground">{row.rate20}</div>
                              <div className="text-right text-foreground">{row.rate40}</div>
                              <div className="text-muted-foreground">{row.currency}</div>
                            </div>
                          ))}
                          <div className="grid grid-cols-[1.1fr_2.1fr_0.9fr_0.8fr_0.8fr_0.5fr] items-center gap-4 border-t border-[#CFC8D4] bg-background px-4 py-4 text-base font-semibold">
                            <div className="whitespace-nowrap text-foreground">TỔNG CỘNG (All-in Rate)</div>
                            <div />
                            <div />
                            <div className="text-right text-[#F33233]">USD 1,337</div>
                            <div className="text-right text-[#F33233]">USD 2,217</div>
                            <div className="text-muted-foreground">USD</div>
                          </div>
                        </div>
                      </SectionCard>

                      {!isCreatePage ? (
                        <>
                          <SectionCard
                            title="Tương tác Hãng tàu"
                            description="Ghi nhận hãng tàu thực tế, mã booking được cấp và tệp xác nhận để phục vụ xử lý tiếp theo."
                            className="rounded-[16px] border-0"
                            headingIcon={
                              <DetailHeadingIcon>
                                <MessagesSquare className="h-4 w-4" strokeWidth={2.2} />
                              </DetailHeadingIcon>
                            }
                          >
                            <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
                              <div className="space-y-2">
                                <div className="text-base font-medium text-muted-foreground">Hãng tàu (Carrier)</div>
                                <div className="relative">
                                  <select
                                    value={carrierInteractionForm.carrier}
                                    disabled={isDetailsReadOnly}
                                    onChange={(event) =>
                                      setCarrierInteractionForm((current) => ({
                                        ...current,
                                        carrier: event.target.value
                                      }))
                                    }
                                    className="min-h-[46px] w-full appearance-none rounded-2xl border border-input bg-card px-4 pr-10 text-base text-foreground outline-none transition disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                  >
                                    {[
                                      "Maersk (Maersk Line)",
                                      "MSC (Mediterranean Shipping Company)",
                                      "CNC (Cheng Lie Navigation)",
                                      "ONE (Ocean Network Express)",
                                      "Evergreen (Evergreen Line)"
                                    ].map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown
                                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                    strokeWidth={1.8}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="text-base font-medium text-muted-foreground">Mã Booking hãng tàu (Carrier Booking No)</div>
                                <input
                                  value={carrierInteractionForm.carrierBookingNo}
                                  placeholder="Nhập mã booking từ hãng tàu..."
                                  disabled={isDetailsReadOnly}
                                  onChange={(event) =>
                                    setCarrierInteractionForm((current) => ({
                                      ...current,
                                      carrierBookingNo: event.target.value
                                    }))
                                  }
                                  className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="text-base font-medium text-muted-foreground">Tệp đính kèm (Booking Confirmation)</div>
                                <input
                                  ref={bookingConfirmationInputRef}
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) {
                                      return;
                                    }
                                    setCarrierInteractionForm((current) => ({
                                      ...current,
                                      bookingConfirmationFileName: file.name
                                    }));
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={isDetailsReadOnly}
                                  onClick={() => bookingConfirmationInputRef.current?.click()}
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    const file = event.dataTransfer.files?.[0];
                                    if (!file) {
                                      return;
                                    }
                                    setCarrierInteractionForm((current) => ({
                                      ...current,
                                      bookingConfirmationFileName: file.name
                                    }));
                                  }}
                                  className="flex min-h-[104px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9D9E1] bg-card px-6 text-center text-base text-muted-foreground transition disabled:cursor-not-allowed disabled:bg-background disabled:opacity-70 hover:border-border hover:bg-[#FCFCFC]"
                                >
                                  <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.8} />
                                  <div className="mt-3">
                                    {carrierInteractionForm.bookingConfirmationFileName || "Kéo thả hoặc nhấn để tải file PDF"}
                                  </div>
                                </button>
                              </div>
                            </div>
                          </SectionCard>

                          <SectionCard
                            title="Các bên liên quan & Ghi chú"
                            description="Tổng hợp thông tin các bên tham gia lô hàng và ghi chú nội bộ phục vụ quá trình xử lý booking."
                            className="rounded-[16px] border-0"
                            headingIcon={
                              <DetailHeadingIcon>
                                <Users className="h-4 w-4" strokeWidth={2.2} />
                              </DetailHeadingIcon>
                            }
                          >
                            <div className="grid gap-6 xl:grid-cols-3">
                              <div className="space-y-3">
                                <div className="text-base font-medium text-muted-foreground">Shipper (Người gửi hàng)</div>
                                <div className="rounded-2xl border-[0.5px] border-input bg-card px-4 py-4 text-base">
                                  <div className="font-medium text-foreground">PHUONG NAM IMPORT EXPORT CO., LTD</div>
                                  <div className="mt-2 text-muted-foreground">123 Nguyen Hue, District 1, Ho Chi Minh City</div>
                                  <div className="mt-1 text-muted-foreground">Tax ID: 0301234567</div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="text-base font-medium text-muted-foreground">Consignee (Người nhận hàng)</div>
                                <div className="rounded-2xl border-[0.5px] border-input bg-card px-4 py-4 text-base">
                                  <div className="font-medium text-foreground">YAMATO TRADING CO., LTD</div>
                                  <div className="mt-2 text-muted-foreground">4-5-10 Nanko-Kita, Suminoe-ku, Osaka 559-0034</div>
                                  <div className="mt-1 text-muted-foreground">Tax ID: JP7890123456</div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="text-base font-medium text-muted-foreground">Notify Party</div>
                                <div className="rounded-2xl border-[0.5px] border-input bg-card px-4 py-4 text-base">
                                  <div className="font-medium text-foreground">SAME AS CONSIGNEE</div>
                                  <div className="mt-2 text-muted-foreground">4-5-10 Nanko-Kita, Suminoe-ku, Osaka 559-0034</div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 border-t border-[#E7E6E9] pt-5">
                              <div className="space-y-3">
                                <div className="text-base font-medium text-muted-foreground">Ghi chú nội bộ (Internal Notes)</div>
                                <textarea
                                  value={internalNotes}
                                  placeholder="CS ghi chú về việc xử lý vỏ container hoặc điều xe cho bộ phận Điều vận"
                                  disabled={isDetailsReadOnly}
                                  onChange={(event) => setInternalNotes(event.target.value)}
                                  className="min-h-[76px] w-full rounded-2xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-background disabled:text-foreground/80 focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                                />
                              </div>
                            </div>
                          </SectionCard>
                        </>
                      ) : null}

                  </div>
                </div>
              </div>
            ) : null}

            {isBookingListPage ? (
              <>
                <div
                  ref={desktopTableShellRef}
                  className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col"
                >
                  <div
                    className="grid shrink-0 border-b border-border bg-card"
                    style={{
                      gridTemplateColumns: desktopTableColumns,
                      paddingRight: desktopScrollbarWidth ? `${desktopScrollbarWidth}px` : undefined
                    }}
                  >
                    {[
                      "Mã yêu cầu",
                      "Khách hàng",
                      "Tuyến vận chuyển",
                      "Loại hàng",
                      "Đóng gói dự kiến",
                      "Trạng thái",
                      "Ngày tạo",
                      ""
                    ].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`relative flex h-11 w-full min-w-0 items-center justify-start ${
                          index === 0 ? "pl-6 pr-9" : "px-3"
                        } text-left font-inter text-sm font-normal text-muted-foreground ${
                          index === 6 ? "" : ""
                        }`}
                      >
                        {label === "Trạng thái" ? (
                          <div ref={statusFilterRef} className="relative flex items-center gap-1.5">
                            <span>{label}</span>
                            <button
                              type="button"
                              className={`rounded-md p-1 transition-colors ${
                                isStatusFilterOpen || statusFilters.length > 0
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                              onClick={openStatusFilter}
                            >
                              <ListFilter className="h-4 w-4" strokeWidth={1.8} />
                            </button>

                            {isStatusFilterOpen ? (
                              <div className="absolute left-0 top-full z-20 mt-1 w-[220px] overflow-hidden rounded-[12px] border border-[#e7e6e9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                <div className="max-h-[220px] overflow-y-auto py-2">
                                  <button
                                    type="button"
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                                      statusFilters.length === 0 ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                    onClick={selectAllStatuses}
                                  >
                                    <span>{statusFilterAllOption.label}</span>
                                    {statusFilters.length === 0 ? (
                                      <Check className="h-4 w-4 text-foreground" strokeWidth={2} />
                                    ) : null}
                                  </button>
                                  {statusFilterOptions.map((option) => {
                                    const isSelected = statusFilters[0] === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                                          isSelected ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                        onClick={() => toggleStatusFilterValue(option.value)}
                                      >
                                        <span>{option.label}</span>
                                        {isSelected ? <Check className="h-4 w-4 text-foreground" strokeWidth={2} /> : null}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          label
                        )}
                      </div>
                    ))}
                  </div>

                  <div
                    ref={desktopTableBodyRef}
                    className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
                    style={desktopRowsHeight ? { height: `${desktopRowsHeight}px` } : undefined}
                  >
                    {paginatedBookingRows.length > 0 ? (
                      paginatedBookingRows.map((row, index) => (
                        <div
                          key={row.code}
                          className="ui-hover-row group grid cursor-pointer bg-card transition-colors"
                          style={{ gridTemplateColumns: desktopTableColumns }}
                          role="button"
                          tabIndex={0}
                          onClick={() => openBookingDetails(row.code)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openBookingDetails(row.code);
                            }
                          }}
                        >
                          {(() => {
                            const isSelectedRow = selectedRowCodes.includes(row.code);
                            const selectedRowClass = isSelectedRow ? "bg-[#B6E1FF]" : "";
                            return (
                              <>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full min-w-0 items-center justify-start gap-3 whitespace-nowrap pl-6 pr-9 text-left text-sm font-semibold text-foreground transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            <label
                              className="-m-2 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRowCodes.includes(row.code)}
                                aria-label={`Chọn ${row.code}`}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setSelectedRowCodes((current) =>
                                    checked
                                      ? [...current, row.code]
                                      : current.filter((code) => code !== row.code)
                                  );
                                }}
                                className="h-4 w-4 shrink-0 rounded border border-input accent-[#245698]"
                              />
                            </label>
                            {formatBookingCode(row.code)}
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full min-w-0 items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.customer}
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            <RouteCell {...row.route} />
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.cargoType}
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.packaging}
                          </div>
                          <div
                            className={`ui-hover-row-cell h-12 px-3 text-left text-sm text-foreground flex items-center justify-start transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            <BookingStatusTag status={row.status} />
                          </div>
                          <div
                            className={`ui-hover-row-cell h-12 px-3 text-left text-sm text-foreground flex items-center justify-start transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.createdAt}
                          </div>
                          <div
                            className={`ui-hover-row-cell h-12 px-3 text-center flex items-center justify-center transition-colors ${selectedRowClass} ${
                              index === paginatedBookingRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            <div
                              ref={openRowActionCode === row.code ? rowActionMenuRef : undefined}
                              className="relative"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                aria-label={`Tác vụ cho ${row.code}`}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenRowActionCode((current) => (current === row.code ? null : row.code));
                                }}
                              >
                                <MoreVertical className="h-4 w-4" strokeWidth={1.8} />
                              </button>

                              {openRowActionCode === row.code ? (
                                <div className="absolute right-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                  {[
                                    {
                                      label: "Xem chi tiết",
                                      icon: Eye,
                                      onClick: () => openBookingDetails(row.code)
                                    },
                                    {
                                      label: "Chỉnh sửa",
                                      icon: Pencil,
                                      onClick: () => setOpenRowActionCode(null)
                                    },
                                    {
                                      label: "Xóa",
                                      icon: Trash2,
                                      onClick: () => setOpenRowActionCode(null)
                                    }
                                  ].map((item, itemIndex) => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                        itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                      }`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenRowActionCode(null);
                                        item.onClick();
                                      }}
                                    >
                                      <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                              </>
                            );
                          })()}
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
                        Không có yêu cầu đặt chỗ phù hợp với bộ lọc hiện tại.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:hidden">
                  <div className="grid gap-3">
                    {paginatedBookingRows.length > 0 ? (
                      paginatedBookingRows.map((row) => (
                        <article
                          key={row.code}
                          className="ui-hover-soft cursor-pointer rounded-2xl border border-border bg-card p-4 transition-colors"
                          role="button"
                          tabIndex={0}
                          onClick={() => openBookingDetails(row.code)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openBookingDetails(row.code);
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-3 whitespace-nowrap text-sm font-semibold text-foreground">
                              <BookingCodeIcon />
                              {formatBookingCode(row.code)}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{row.createdAt}</div>
                            <div className="mt-2">
                              <BookingStatusTag status={row.status} />
                            </div>
                          </div>
                            <button className="rounded-full p-2 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" strokeWidth={1.8} />
                            </button>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Khách hàng</div>
                              <div className="mt-1 text-sm text-foreground">{row.customer}</div>
                            </div>

                            <div>
                              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Tuyến vận chuyển</div>
                              <div className="mt-1">
                                <RouteCell {...row.route} />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Loại hàng</div>
                                <div className="mt-1 text-sm text-foreground">{row.cargoType}</div>
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Đóng gói</div>
                                <div className="mt-1 text-sm text-foreground">{row.packaging}</div>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                        Không có yêu cầu đặt chỗ phù hợp với bộ lọc hiện tại.
                      </div>
                    )}
                  </div>
                </div>

                {shipmentListRows.length > shipmentListPageSize ? (
                  <div className="mt-4 flex items-center justify-center px-1 pb-2 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cbccc9] bg-card text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setCustomerShipmentPage((current) => Math.max(1, current - 1))}
                        disabled={customerShipmentPage === 1}
                      >
                        {"<"}
                      </button>
                      {Array.from({ length: shipmentListPageCount }, (_, index) => index + 1).map((page) => (
                        <button
                          key={`shipment-page-${page}`}
                          type="button"
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                            page === customerShipmentPage
                              ? "bg-[#7A7A7A] text-white"
                              : "border border-[#cbccc9] bg-card text-foreground hover:bg-background"
                          }`}
                          onClick={() => setCustomerShipmentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#cbccc9] bg-card text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
                        onClick={() => setCustomerShipmentPage((current) => Math.min(shipmentListPageCount, current + 1))}
                        disabled={customerShipmentPage === shipmentListPageCount}
                      >
                        {">"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {isCustomerListPage ? (
              <>
                <div
                  className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col"
                >
                  <div
                    className="grid shrink-0 border-b-[0.5px] border-border bg-card"
                    style={{
                      gridTemplateColumns: customerTableColumns,
                      paddingRight: customerTableScrollbarWidth ? `${customerTableScrollbarWidth}px` : undefined
                    }}
                  >
                    {["", "Mã KH", "Tên khách hàng", "MST", "Công ty phụ trách", "Phân khúc", "Trạng thái"].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`flex h-11 w-full min-w-0 items-center justify-start text-left text-sm font-normal text-muted-foreground ${
                          index === 0 ? "justify-center px-2" : index === 1 ? "pl-6 pr-9" : "px-4"
                        }`}
                      >
                        {label === "Trạng thái" ? (
                          <span>{label}</span>
                        ) : (
                          label
                        )}
                      </div>
                    ))}
                  </div>

                  <div ref={customerTableBodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
	                    {paginatedCustomerRows.length > 0 ? (
	                      paginatedCustomerRows.map((row, index) => (
	                        <div
	                          key={row.customer}
	                          className={`grid cursor-pointer transition-colors hover:bg-[#B6E1FF] ${
	                            selectedCustomerRowKeys.includes(row.customer) ? "bg-[#B6E1FF]" : "bg-card"
	                          }`}
	                          style={{ gridTemplateColumns: customerTableColumns }}
	                          role="button"
                          tabIndex={0}
                          onClick={() => openCustomerDetails(row.customer)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openCustomerDetails(row.customer);
                            }
                          }}
                        >
                          <div
                            className={`flex h-12 items-center justify-center px-2 ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}
                          >
                            <label
                              className="-m-2 flex h-8 w-8 cursor-pointer items-center justify-center"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={selectedCustomerRowKeys.includes(row.customer)}
                                className="h-4 w-4 rounded border-border text-[#245698] focus:ring-[#245698]"
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setSelectedCustomerRowKeys((current) =>
                                    checked ? [...current, row.customer] : current.filter((key) => key !== row.customer)
                                  );
                                }}
                              />
                            </label>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden pl-6 pr-4 text-left text-sm font-medium text-foreground ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.customerCode}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 pr-9 text-left text-sm font-semibold text-foreground ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.customer}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.taxId}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {row.contractCompany.split(" / ").map((company) => (
                                <span
                                  key={`${row.customer}-${company}`}
                                  className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-foreground"
                                >
                                  {company}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.customerGroup}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <CustomerAccountStatusTag status={row.status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
                        Không có khách hàng phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:hidden">
                  <div className="grid gap-3">
                    {paginatedCustomerRows.length > 0 ? (
                      paginatedCustomerRows.map((row) => (
                        <article
                          key={row.customer}
                          className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-[#B6E1FF]"
                        >
                          <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{row.customerCode}</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{row.customer}</div>
                          <div className="mt-3 space-y-2 text-sm text-foreground">
                            <div>
                              <span className="text-muted-foreground">MST: </span>
                              {row.taxId}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-muted-foreground">Công ty PT: </span>
                              {row.contractCompany.split(" / ").map((company) => (
                                <span
                                  key={`${row.customer}-mobile-${company}`}
                                  className="inline-flex items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2 py-1 text-xs font-medium text-foreground"
                                >
                                  {company}
                                </span>
                              ))}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Phân khúc: </span>
                              {row.customerGroup}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Trạng thái: </span>
                              <span className="inline-flex align-middle">
                                <CustomerAccountStatusTag status={row.status} />
                              </span>
                            </div>
                            <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
                              <span className="text-muted-foreground">Dịch vụ: </span>
                              {row.services[0] ? (
                                <CustomerServiceTag key={`${row.customer}-${row.services[0]}`} service={row.services[0]} />
                              ) : null}
                              {row.services.length > 1 ? (
                                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2 py-1 text-xs font-medium text-foreground">
                                  {`${row.services.length - 1}+`}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                        Không có khách hàng phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {isCustomerCreateLikePage ? (
              <div className={`mt-1 pr-1 ${isAnyCreatePage ? "min-h-fit overflow-visible" : "min-h-0 flex-1 overflow-y-auto"}`}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-0">
                    {isCustomerDetailsPage ? <div /> : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-[#F3F4F6] px-2.5 text-[13px] font-medium text-[#9CA3AF] opacity-100"
                      >
                        <Mail className="h-4 w-4 text-[#9CA3AF]" strokeWidth={1.9} />
                        Gửi email
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                      {customerCreateWorkflowSteps.map((step, index) => (
                        <div
                          key={step}
                          className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                            (
                              selectedCustomerRow?.status === "locked"
                                ? index === 2
                                : selectedCustomerRow?.status === "active"
                                  ? index === 1
                                  : index === 0
                            )
                              ? "bg-[#2054a3] text-white"
                              : "bg-[#EAF1FB] text-[#245698]"
                          } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-card">
                    <div className="p-4">
                      <div className="rounded-[14px] border border-[#DADCE3] bg-white shadow-[0_2px_10px_rgba(17,17,17,0.04)]">
              <div className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Star className="h-7 w-7 text-muted-foreground" strokeWidth={1.8} />
                            <div className="text-[24px] font-semibold leading-none text-foreground">
                              {isCustomerDetailsPage ? selectedCustomerRow?.customerCode ?? "Chi tiết Khách hàng" : "Thêm mới Khách hàng"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 px-5 pb-5 pt-0">
                          <div className="space-y-3">
                            <div className="text-[16px] font-medium text-foreground">THÔNG TIN KHÁCH HÀNG</div>
                            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
                              <div className="space-y-0">
                                {isCustomerDetailsPage ? (
                                  <FormField
                                    label="Mã KH"
                                    value={selectedCustomerRow?.customerCode ?? ""}
                                    placeholder="Tự động tạo sau khi lưu"
                                    variant="inlineUnderline"
                                    readOnly
                                  />
                                ) : null}
                                <FormField
                                  label="Tên pháp lý (VN)"
                                  value={customerCreateForm.customerName}
                                  error={customerCreateErrors.customerName}
                                  placeholder="Tên đầy đủ theo GPKD"
                                  variant="inlineUnderline"
                                  allowWrapWhenReadOnly
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onChange={(value) => updateCustomerCreateForm("customerName", value)}
                                />
                                <FormField
                                  label="Tên tiếng Anh"
                                  value={customerCreateForm.englishName}
                                  error={customerCreateErrors.englishName}
                                  placeholder="Tên trên B/L, AWB, thư gửi đối tác quốc tế"
                                  variant="inlineUnderline"
                                  allowWrapWhenReadOnly
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onChange={(value) => updateCustomerCreateForm("englishName", value)}
                                />
                                <FormField
                                  label="Mã số thuế (MST)"
                                  value={customerCreateForm.taxId}
                                  error={customerCreateErrors.taxId}
                                  placeholder="10 hoặc 13 chữ số"
                                  variant="inlineUnderline"
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onChange={(value) => updateCustomerCreateForm("taxId", value.replace(/\D/g, ""))}
                                />
                                <FormField
                                  label="SĐT"
                                  value={customerCreateForm.phone}
                                  error={customerCreateErrors.phone}
                                  placeholder="Nhập SĐT"
                                  variant="inlineUnderline"
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onChange={(value) =>
                                    updateCustomerCreateForm(
                                      "phone",
                                      value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "")
                                    )
                                  }
                                />
                              </div>

                              <div className="space-y-0">
                                <FormField
                                  label="Email"
                                  value={customerCreateForm.email}
                                  error={customerCreateErrors.email}
                                  placeholder="Nhập email"
                                  variant="inlineUnderline"
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onChange={(value) => updateCustomerCreateForm("email", value)}
                                />
                                <FormField
                                  label="Website"
                                  value={customerCreateForm.website}
                                  error={customerCreateErrors.website}
                                  placeholder="https://example.com"
                                  variant="inlineUnderline"
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onChange={(value) => updateCustomerCreateForm("website", value)}
                                />
                                <InlineDropdownField
                                  label="Tags / Phân khúc"
                                  values={customerCreateForm.tags}
                                  options={customerSegmentOptions}
                                  readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                                  onToggle={(value) => toggleCustomerCreateMultiValue("tags", value)}
                                  error={customerCreateErrors.tags}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="my-3 h-[0.5px] w-full bg-[#E7E6E9]" />

                          <div className="space-y-3">
                            <div className="text-[16px] font-medium text-foreground">THÔNG TIN CÔNG TY PHỤ TRÁCH</div>
                            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
                              <div className="space-y-0">
                                {isCustomerDetailsPage ? (
                                  <FormField
                                    label="Công ty phụ trách"
                                    value={selectedResponsibleCompany}
                                    variant="inlineUnderline"
                                    readOnly
                                  />
                                ) : (
                                  <InlineDropdownField
                                    label="Công ty phụ trách"
                                    values={customerCreateForm.responsibleCompanies}
                                    options={customerResponsibleCompanyOptions}
                                    readOnly={false}
                                    onToggle={(value) => toggleCustomerCreateMultiValue("responsibleCompanies", value)}
                                    error={customerCreateErrors.responsibleCompanies}
                                  />
                                )}
                                <FormField
                                  label="Mã số thuế (MST)"
                                  value={selectedResponsibleCompanyInfo?.taxId ?? ""}
                                  error={customerCreateErrors.taxId}
                                  placeholder="MST"
                                  variant="inlineUnderline"
                                  readOnly
                                  onChange={(value) => updateCustomerCreateForm("taxId", value.replace(/\D/g, ""))}
                                />
                              </div>

                              <div className="space-y-0">
                                <FormField
                                  label="SĐT"
                                  value={selectedResponsibleCompanyInfo?.phone ?? ""}
                                  error={customerCreateErrors.phone}
                                  placeholder="Nhập SĐT"
                                  variant="inlineUnderline"
                                  readOnly
                                  onChange={(value) =>
                                    updateCustomerCreateForm(
                                      "phone",
                                      value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "")
                                    )
                                  }
                                />
                                <FormField
                                  label="Email"
                                  value={selectedResponsibleCompanyInfo?.email ?? ""}
                                  error={customerCreateErrors.email}
                                  placeholder="Nhập email"
                                  variant="inlineUnderline"
                                  readOnly
                                  onChange={(value) => updateCustomerCreateForm("email", value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-0 border-t border-[#E7E6E9]">
                          <div className="flex flex-wrap items-end gap-0 border-b border-[#E7E6E9] px-5 pt-0">
                            {[
                              { key: "address", label: "Địa chỉ" },
                              { key: "contacts", label: "Liên hệ" },
                              { key: "notes", label: "Ghi chú" }
                            ].map((tab) => {
                              const isActive = customerCreateWorkspaceTab === tab.key;
                              return (
                                <button
                                  key={tab.key}
                                  type="button"
                                  className={`inline-flex h-9 items-center border-r border-[#CDD3E3] px-4 text-[14px] font-medium ${
                                    isActive
                                      ? "border-b-2 border-b-[#4A63B8] bg-[#F3F4F6] text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                  onClick={() => setCustomerCreateWorkspaceTab(tab.key as "address" | "contacts" | "routes" | "notes")}
                                >
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="px-5 py-0">
                            {customerCreateWorkspaceTab === "address" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Số nhà, tên đường", "Phường/Xã, Quận/Huyện", "Tỉnh/Thành phố", "Quốc gia", "Mã bưu chính", "Loại địa chỉ"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {customerAddressRows.map((row, rowIndex) => (
                                    <div
                                      key={`customer-address-row-${rowIndex}`}
                                      className="grid grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="px-4 py-2">{row.line1 || "-"}</div>
                                      <div className="px-4 py-2">{row.line2 || "-"}</div>
                                      <div className="px-4 py-2">{row.city || "-"}</div>
                                      <div className="px-4 py-2">{row.country || "-"}</div>
                                      <div className="px-4 py-2">{row.postalCode || "-"}</div>
                                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                                        <span className="truncate">{row.addressType || "-"}</span>
                                        {canEditCustomerDetailTabs ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCustomerAddressRows((current) =>
                                                current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                              )
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                  {isCustomerAddressFormOpen ? (
                                    <div
                                      ref={customerAddressInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasCustomerAddressDraft
                                          ? "grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr_auto]"
                                          : "grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerAddressForm.line1}
                                          onChange={(event) =>
                                            setCustomerAddressForm((current) => ({ ...current, line1: event.target.value }))
                                          }
                                          placeholder="Số nhà, tên đường"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerAddressForm.line2}
                                          onChange={(event) =>
                                            setCustomerAddressForm((current) => ({ ...current, line2: event.target.value }))
                                          }
                                          placeholder="Phường/Xã, Quận/Huyện"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={customerAddressForm.country}
                                          options={customerAddressCountryOptions}
                                          onChange={(value) =>
                                            setCustomerAddressForm((current) => ({
                                              ...current,
                                              country: value,
                                              city: (customerAddressProvinceOptions[value] ?? [])[0]?.value ?? ""
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={customerAddressForm.city}
                                          options={customerAddressCityOptions}
                                          onChange={(value) =>
                                            setCustomerAddressForm((current) => ({ ...current, city: value }))
                                          }
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerAddressForm.postalCode}
                                          onChange={(event) =>
                                            setCustomerAddressForm((current) => ({
                                              ...current,
                                              postalCode: event.target.value.replace(/\D/g, "").slice(0, 6)
                                            }))
                                          }
                                          placeholder="5-6 chữ số"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={customerAddressForm.addressType}
                                          options={customerAddressTypeOptions}
                                          onChange={(value) =>
                                            setCustomerAddressForm((current) => ({ ...current, addressType: value }))
                                          }
                                        />
                                      </div>
                                      {hasCustomerAddressDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCustomerAddressForm(initialCustomerAddressForm);
                                              setIsCustomerAddressFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {!canEditCustomerDetailTabs ? null : Array.from({ length: emptyCustomerAddressRows }).map((_, rowIndex) =>
                                    rowIndex === 0 ? (
                                      <button
                                        key="customer-address-add-row"
                                        type="button"
                                        className="grid w-full grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextCustomerAddressRow}
                                      >
                                        <div className="col-span-6 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`customer-address-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                                          <div key={`customer-address-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : customerCreateWorkspaceTab === "contacts" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Họ tên", "Vai trò", "SĐT", "Email", "Phòng ban", "Liên hệ chính", "Ghi chú"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {customerContactRows.map((row, rowIndex) => (
                                    <div
                                      key={`customer-contact-row-${rowIndex}`}
                                      className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="px-4 py-2">{row.fullName || "-"}</div>
                                      <div className="px-4 py-2">{row.role || "-"}</div>
                                      <div className="px-4 py-2">{row.phone || "-"}</div>
                                      <div className="px-4 py-2">{row.email || "-"}</div>
                                      <div className="px-4 py-2">{row.department || "-"}</div>
                                      <div className="px-4 py-2">{row.isPrimary ? "Có" : "-"}</div>
                                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                                        <span className="truncate">{row.notes || "-"}</span>
                                        {canEditCustomerDetailTabs ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setCustomerContactRows((current) =>
                                                current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                              )
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                  {isCustomerContactFormOpen ? (
                                    <div
                                      ref={customerContactInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasCustomerContactDraft
                                          ? "grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr_auto]"
                                          : "grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerContactForm.fullName}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, fullName: event.target.value }))
                                          }
                                          placeholder="Tên liên hệ đầy đủ"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={customerContactForm.role}
                                          options={customerContactRoleOptions}
                                          onChange={(value) =>
                                            setCustomerContactForm((current) => ({ ...current, role: value }))
                                          }
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerContactForm.phone}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({
                                              ...current,
                                              phone: event.target.value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "")
                                            }))
                                          }
                                          placeholder="SĐT trực tiếp"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerContactForm.email}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, email: event.target.value }))
                                          }
                                          placeholder="Email"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerContactForm.department}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, department: event.target.value }))
                                          }
                                          placeholder="Phòng ban"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <label className="flex h-8 w-8 cursor-pointer items-center justify-center">
                                          <input
                                            type="checkbox"
                                            checked={customerContactForm.isPrimary}
                                            onChange={(event) =>
                                              setCustomerContactForm((current) => ({ ...current, isPrimary: event.target.checked }))
                                            }
                                            className="h-4 w-4 rounded border-border text-[#245698] focus:ring-[#245698]"
                                          />
                                        </label>
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={customerContactForm.notes}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, notes: event.target.value }))
                                          }
                                          placeholder="Ghi chú đặc biệt về liên hệ này"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      {hasCustomerContactDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCustomerContactForm(initialCustomerContactForm);
                                              setIsCustomerContactFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {!canEditCustomerDetailTabs ? null : Array.from({ length: emptyCustomerContactRows }).map((_, rowIndex) =>
                                    rowIndex === 0 ? (
                                      <button
                                        key="customer-contact-add-row"
                                        type="button"
                                        className="grid w-full grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextCustomerContactRow}
                                      >
                                        <div className="col-span-7 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`customer-contact-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 7 }).map((__, cellIndex) => (
                                          <div key={`customer-contact-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : customerCreateWorkspaceTab === "routes" ? (
                              <div className="px-4 py-4">
                                {customerRouteRows.length === 0 && !isCustomerRouteFormOpen ? (
                                  !canEditCustomerDetailTabs ? null : (
                                  <button
                                    type="button"
                                    onClick={openNextCustomerRouteRow}
                                    className="inline-flex h-[36px] items-center gap-2 text-[14px] text-[#4A63B8] transition hover:text-[#3550a3]"
                                  >
                                    <Plus className="h-4 w-4" strokeWidth={2.2} />
                                    Thêm tuyến hàng
                                  </button>
                                  )
                                ) : (
                                  <div className="space-y-4">
                                    {customerRouteRows.map((row, index) => (
                                      <div key={`customer-route-row-${index}`} className="space-y-3 rounded-[16px] border border-[#E7E6E9] bg-[#FCFCFD] px-4 py-4">
                                        <div className="text-[14px] font-semibold text-foreground">
                                          Tuyến hàng {String(index + 1).padStart(2, "0")}
                                        </div>
                                        <div className="grid gap-x-4 gap-y-0 lg:grid-cols-2">
                                          <div className="space-y-0">
                                            <InlineCompactField label="Hướng vận chuyển">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteDirectionOptions, row.shippingDirection) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Phương thức vận tải">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteTransportModeOptions, row.transportMode) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Incoterm">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteIncotermOptions, row.incoterm) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Nhóm hàng hóa">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteCargoGroupOptions, row.cargoGroup) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Mô tả hàng hóa">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{row.cargoDescription || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="HS Code">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{row.hsCode || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Nước xuất">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteCountryOptions, row.exportCountry) || "-"}</div>
                                            </InlineCompactField>
                                          </div>
                                          <div className="space-y-0">
                                            <InlineCompactField label="Nước nhập">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteCountryOptions, row.importCountry) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="POL (Cảng xếp)">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRoutePolOptions, row.pol) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="POD (Cảng dỡ)">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRoutePodOptions, row.pod) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Loại container">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{resolveSelectOptionLabel(customerRouteContainerTypeOptions, row.containerType) || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Volume dự kiến (CBM)">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{row.estimatedVolume || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Trọng lượng dự kiến (KG)">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{row.estimatedWeight || "-"}</div>
                                            </InlineCompactField>
                                            <InlineCompactField label="Yêu cầu khác">
                                              <div className="flex h-6 items-center text-[13px] text-foreground">{row.otherRequirements || "-"}</div>
                                            </InlineCompactField>
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    {isCustomerRouteFormOpen ? (
                                      <div ref={customerRouteInlineFormRef} className="space-y-3 rounded-[16px] border border-[#E7E6E9] bg-[#FCFCFD] px-4 py-4">
                                        <div className="text-[14px] font-semibold text-foreground">
                                          Tuyến hàng {String(customerRouteRows.length + 1).padStart(2, "0")}
                                        </div>
                                        <div className="grid gap-x-4 gap-y-0 lg:grid-cols-2">
                                          <div className="space-y-0">
                                            <InlineCompactField label="Hướng vận chuyển">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.shippingDirection} options={customerRouteDirectionOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, shippingDirection: value }))} />
                                            </InlineCompactField>
                                            <InlineCompactField label="Phương thức vận tải">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.transportMode} options={customerRouteTransportModeOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, transportMode: value }))} />
                                            </InlineCompactField>
                                            <InlineCompactField label="Incoterm">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.incoterm} options={customerRouteIncotermOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, incoterm: value }))} placeholder="Chọn Incoterm" />
                                            </InlineCompactField>
                                            <InlineCompactField label="Nhóm hàng hóa">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.cargoGroup} options={customerRouteCargoGroupOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, cargoGroup: value }))} />
                                            </InlineCompactField>
                                            <InlineCompactField label="Mô tả hàng hóa">
                                              <input value={customerRouteForm.cargoDescription} onChange={(event) => setCustomerRouteForm((current) => ({ ...current, cargoDescription: event.target.value }))} placeholder="Tên hàng cụ thể" className="h-6 w-full border-0 bg-transparent px-0 text-[13px] text-foreground outline-none placeholder:text-[#9CA3AF]" />
                                            </InlineCompactField>
                                            <InlineCompactField label="HS Code">
                                              <input value={customerRouteForm.hsCode} onChange={(event) => setCustomerRouteForm((current) => ({ ...current, hsCode: event.target.value.replace(/\D/g, "").slice(0, 10) }))} placeholder="6-10 số" className="h-6 w-full border-0 bg-transparent px-0 text-[13px] text-foreground outline-none placeholder:text-[#9CA3AF]" />
                                            </InlineCompactField>
                                            <InlineCompactField label="Nước xuất">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.exportCountry} options={customerRouteCountryOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, exportCountry: value }))} placeholder="Chọn nước xuất" />
                                            </InlineCompactField>
                                          </div>
                                          <div className="space-y-0">
                                            <InlineCompactField label="Nước nhập">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.importCountry} options={customerRouteCountryOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, importCountry: value }))} placeholder="Chọn nước nhập" />
                                            </InlineCompactField>
                                            <InlineCompactField label="POL (Cảng xếp)">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.pol} options={customerRoutePolOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, pol: value }))} placeholder="Chọn POL" />
                                            </InlineCompactField>
                                            <InlineCompactField label="POD (Cảng dỡ)">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.pod} options={customerRoutePodOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, pod: value }))} placeholder="Chọn POD" />
                                            </InlineCompactField>
                                            <InlineCompactField label="Loại container">
                                              <TableDropdownField heightClass="h-6" textSizeClass="text-[13px]" value={customerRouteForm.containerType} options={customerRouteContainerTypeOptions} onChange={(value) => setCustomerRouteForm((current) => ({ ...current, containerType: value }))} placeholder="Chọn loại container" />
                                            </InlineCompactField>
                                            <InlineCompactField label="Volume dự kiến (CBM)">
                                              <input value={customerRouteForm.estimatedVolume} onChange={(event) => setCustomerRouteForm((current) => ({ ...current, estimatedVolume: event.target.value }))} placeholder="Ước tính volume" className="h-6 w-full border-0 bg-transparent px-0 text-[13px] text-foreground outline-none placeholder:text-[#9CA3AF]" />
                                            </InlineCompactField>
                                            <InlineCompactField label="Trọng lượng dự kiến (KG)">
                                              <input value={customerRouteForm.estimatedWeight} onChange={(event) => setCustomerRouteForm((current) => ({ ...current, estimatedWeight: event.target.value }))} placeholder="Ước tính trọng lượng" className="h-6 w-full border-0 bg-transparent px-0 text-[13px] text-foreground outline-none placeholder:text-[#9CA3AF]" />
                                            </InlineCompactField>
                                            <InlineCompactField label="Yêu cầu khác">
                                              <input value={customerRouteForm.otherRequirements} onChange={(event) => setCustomerRouteForm((current) => ({ ...current, otherRequirements: event.target.value }))} placeholder="Yêu cầu đặc biệt" className="h-6 w-full border-0 bg-transparent px-0 text-[13px] text-foreground outline-none placeholder:text-[#9CA3AF]" />
                                            </InlineCompactField>
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}

                                    {!canEditCustomerDetailTabs ? null : (
                                      <button
                                        type="button"
                                        onClick={openNextCustomerRouteRow}
                                        className="inline-flex h-[36px] items-center gap-2 text-[14px] text-[#4A63B8] transition hover:text-[#3550a3]"
                                      >
                                        <Plus className="h-4 w-4" strokeWidth={2.2} />
                                        Thêm tuyến hàng
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="px-4 py-4">
                                <div className="max-w-[980px] space-y-3">
                                  <TiptapRichTextEditor
                                    value={customerInternalNotes}
                                    onChange={setCustomerInternalNotes}
                                    placeholder="Ghi chú nội bộ. Không gửi cho KH. Ghi thông tin đặc biệt về KH"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="space-y-5">
                      {customerCreateActivityGroups.map((group) => (
                        <div key={group.label}>
                          <div className="relative flex items-center justify-center">
                            <div className="absolute inset-x-0 top-1/2 h-[0.5px] -translate-y-1/2 bg-[#E7E6E9]" />
                            <div className="relative bg-background px-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{group.label}</div>
                          </div>
                          <div className="mt-4 space-y-3">
                            {group.entries.map((entry) => (
                              <div key={`${group.label}-${entry.actor}-${entry.time}`} className="flex items-start gap-3">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-white ${getAvatarColorClass(entry.actor)}`}>
                                  {entry.actor.trim().charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">
                                    <span>{entry.actor}</span>
                                    <span className="text-[12px] font-normal text-muted-foreground">{entry.time}</span>
                                  </div>
                                  <div className="mt-1 text-[14px] text-foreground">{entry.message}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isCustomerContractCreatePage || isContractDetailsPage ? (
              <div className={`${isContractDetailsPage ? "-mt-3" : "mt-1"} pr-1 ${isAnyCreatePage ? "min-h-fit overflow-visible" : "min-h-0 flex-1 overflow-y-auto"}`}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isContractDetailsPage && contractCreateForm.status === "draft" ? (
                        <>
                          <button
                            type="button"
                            onClick={submitContractForApproval}
                            className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#2054a3] bg-[#2054a3] px-2.5 text-[13px] font-medium text-white transition hover:bg-[#18478D]"
                          >
                            Gửi duyệt
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveContract}
                            className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-white px-2.5 text-[13px] font-medium text-foreground transition hover:bg-[#F8FAFF]"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={goBackFromCreatePage}
                            className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-white px-2.5 text-[13px] font-medium text-foreground transition hover:bg-[#F8FAFF]"
                          >
                            Hủy
                          </button>
                        </>
                      ) : null}
                      {isContractDetailsPage && contractCreateForm.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={approveContractFromDetails}
                            className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#2054a3] bg-[#2054a3] px-2.5 text-[13px] font-medium text-white transition hover:bg-[#18478D]"
                          >
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={rejectContractFromDetails}
                            className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-white px-2.5 text-[13px] font-medium text-[#B42318] transition hover:bg-[#FFF5F5]"
                          >
                            Từ chối
                          </button>
                        </>
                      ) : null}
                      {isContractDetailsPage && contractCreateForm.status === "accepted" ? (
                        <button
                          type="button"
                          onClick={cancelApprovedContractFromDetails}
                          className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-white px-2.5 text-[13px] font-medium text-[#B42318] transition hover:bg-[#FFF5F5]"
                        >
                          Hủy hợp đồng
                        </button>
                      ) : null}
                      {isContractDetailsPage ? (
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="inline-flex h-8 items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-white px-2.5 text-[13px] font-medium text-foreground transition hover:bg-[#F8FAFF]"
                        >
                          <Printer className="h-4 w-4 text-muted-foreground" strokeWidth={1.9} />
                          In
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          aria-disabled="true"
                          className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-[#F3F4F6] px-2.5 text-[13px] font-medium text-[#9CA3AF] opacity-100"
                        >
                          <Mail className="h-4 w-4 text-[#9CA3AF]" strokeWidth={1.9} />
                          Gửi email
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                      {contractCreateWorkflowSteps.map((step, index) => (
                        <div
                          key={step}
                          className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                            ((contractCreateForm.status === "draft" && index === 0) ||
                            (contractCreateForm.status === "pending" && index === 1) ||
                            (contractCreateForm.status === "accepted" && index === 2) ||
                            (contractCreateForm.status === "active" && index === 3) ||
                            (contractCreateForm.status === "expiring_soon" &&
                              index === contractCreateWorkflowSteps.indexOf("Sắp hết hạn")) ||
                            (contractCreateForm.status === "expired" &&
                              index === contractCreateWorkflowSteps.indexOf("Hết hạn")) ||
                            (contractCreateForm.status === "terminated" &&
                              index === contractCreateWorkflowSteps.indexOf("Hủy hợp đồng")))
                              ? "bg-[#2054a3] text-white"
                              : "bg-[#EAF1FB] text-[#245698]"
                          } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[14px] bg-card">
                    <div className="p-4">
                      <div className="rounded-[14px] border border-[#DADCE3] bg-white shadow-[0_2px_10px_rgba(17,17,17,0.04)]">
                        <div className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Star className="h-7 w-7 text-muted-foreground" strokeWidth={1.8} />
                            <div className="text-[24px] font-semibold leading-none text-foreground">
                              {isContractDetailsPage && selectedContractRow ? selectedContractRow.code : "Thêm mới Hợp đồng"}
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-0">
                          <div className="space-y-3">
                            <div className="text-[16px] font-medium text-foreground">THÔNG TIN HỢP ĐỒNG</div>
                            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
                              <div className="space-y-0">
                                <FormField
                                  label="Khách hàng"
                                  value={contractCreateForm.customer}
                                  readOnly={isContractDetailReadOnly}
                                  error={contractCreateErrors.customer}
                                  options={[
                                    { label: "Chọn khách hàng", value: "" },
                                    ...Array.from(
                                      new Map(
                                        [
                                          ...(isContractDetailsPage && selectedContractRow
                                            ? [{ label: selectedContractRow.customer, value: selectedContractRow.customer }]
                                            : []),
                                          ...customerRows
                                            .filter((row) => row.status === "active")
                                            .map((row) => ({ label: row.customer, value: row.customer }))
                                        ].map((option) => [option.value, option] as const)
                                      ).values()
                                    )
                                  ]}
                                  placeholder="Chọn khách hàng"
                                  variant="inlineUnderline"
                                  autoSelectFirstOption={false}
                                  matchDropdownWidth
                                  onChange={(value) => {
                                    const selectedCustomer = customerRows.find((row) => row.customer === value);
                                    setContractCreateErrors((current) => {
                                      const nextErrors = { ...current };
                                      delete nextErrors.customer;
                                      return nextErrors;
                                    });
                                    setContractCreateForm((current) => ({
                                      ...current,
                                      customer: value,
                                      contractCompany: selectedCustomer?.contractCompany ?? ""
                                    }));
                                  }}
                                />
                                <FormField
                                  label="Loại hợp đồng"
                                  value={contractCreateForm.contractType}
                                  readOnly={isContractDetailReadOnly}
                                  error={contractCreateErrors.contractType}
                                  options={[
                                    { label: "Chọn loại hợp đồng", value: "" },
                                    { label: "Hợp đồng thương mại", value: "Hợp đồng thương mại" },
                                    { label: "Hợp đồng nguyên tắc", value: "Hợp đồng nguyên tắc" },
                                    { label: "Hợp đồng kinh tế", value: "Hợp đồng kinh tế" }
                                  ]}
                                  variant="inlineUnderline"
                                  onChange={(value) => {
                                    setContractCreateErrors((current) => {
                                      const nextErrors = { ...current };
                                      delete nextErrors.contractType;
                                      return nextErrors;
                                    });
                                    setContractCreateForm((current) => ({ ...current, contractType: value }));
                                  }}
                                />
                              </div>
                              <div className="space-y-0">
                                <FormField
                                  label="Ngày hiệu lực"
                                  type="date"
                                  value={contractCreateForm.validFrom}
                                  readOnly={isContractDetailReadOnly}
                                  error={contractCreateErrors.validFrom}
                                  variant="inlineUnderline"
                                  onChange={(value) => {
                                    setContractCreateErrors((current) => {
                                      const nextErrors = { ...current };
                                      delete nextErrors.validFrom;
                                      return nextErrors;
                                    });
                                    setContractCreateForm((current) => ({ ...current, validFrom: value }));
                                  }}
                                />
                                <FormField
                                  label="Ngày hết hạn"
                                  type="date"
                                  value={contractCreateForm.validTo}
                                  readOnly={isContractDetailReadOnly}
                                  error={contractCreateErrors.validTo}
                                  variant="inlineUnderline"
                                  onChange={(value) => {
                                    setContractCreateErrors((current) => {
                                      const nextErrors = { ...current };
                                      delete nextErrors.validTo;
                                      return nextErrors;
                                    });
                                    setContractCreateForm((current) => ({ ...current, validTo: value }));
                                  }}
                                />
                                <FormField
                                  label="Ngày ký kết"
                                  type="date"
                                  value={contractCreateForm.signedAt}
                                  readOnly={isContractDetailReadOnly}
                                  variant="inlineUnderline"
                                  onChange={(value) => setContractCreateForm((current) => ({ ...current, signedAt: value }))}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="my-3 h-[0.5px] w-full bg-[#E7E6E9]" />

                          <div className="space-y-3">
                            <div className="text-[16px] font-medium text-foreground">PHẠM VI DỊCH VỤ</div>
                            <div className="grid grid-cols-1 divide-y-[0.5px] divide-[#E7E6E9] rounded-[8px] border-[0.5px] border-[#E7E6E9] bg-white">
                              {contractDisplayServiceOptions.map((service) => {
                                const checked = contractCreateForm.services.includes(service);
                                const selectedItems = contractCreateForm.serviceItems[service] ?? [];
                                const shouldShowNestedItems = checked && service === "🌍 Vận tải quốc tế";
                                return (
                                  <div key={service} className="px-4 py-4">
                                    <label className="flex min-h-[32px] cursor-pointer items-center gap-3 text-[15px] font-semibold text-foreground">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isContractDetailReadOnly}
                                        className="h-5 w-5 rounded border-border text-[#245698] focus:ring-[#245698]"
                                        onChange={() =>
                                          setContractCreateForm((current) => ({
                                            ...current,
                                            services: current.services.includes(service)
                                              ? current.services.filter((item) => item !== service)
                                              : [...current.services, service],
                                            serviceItems: current.services.includes(service)
                                              ? Object.fromEntries(
                                                  Object.entries(current.serviceItems).filter(([key]) => key !== service)
                                                )
                                              : {
                                                  ...current.serviceItems,
                                                  [service]: current.serviceItems[service] ?? []
                                                }
                                          }))
                                        }
                                      />
                                      <span>{service}</span>
                                    </label>
                                    {shouldShowNestedItems ? (
                                      <div className="mt-3 space-y-2 pl-8">
                                        {contractDisplayServiceItemOptions[service].map((item) => {
                                          const itemChecked = selectedItems.includes(item);
                                          const feeNotes =
                                            service === "🌍 Vận tải quốc tế"
                                              ? contractInternationalServiceFeeNotes[item] ?? []
                                              : [];
                                          const feeDraft =
                                            contractInternationalFeeDrafts[item] ?? initialContractServiceFeeDraftForm;
                                          const hasFeeDraftValue =
                                            feeDraft.feeName.trim().length > 0 ||
                                            feeDraft.currency.trim().length > 0 ||
                                            feeDraft.rate.trim().length > 0;
                                          return (
                                            <label
                                              key={item}
                                              className={`flex cursor-pointer items-start gap-2 rounded-[8px] px-3 py-2 text-[14px] text-foreground ${
                                                service === "🌍 Vận tải quốc tế" ? "bg-[#F7F7F8]" : ""
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={itemChecked}
                                                disabled={isContractDetailReadOnly}
                                                className="mt-[2px] h-4 w-4 rounded border-border text-[#245698] focus:ring-[#245698]"
                                                onChange={() =>
                                                  setContractCreateForm((current) => {
                                                    const currentItems = current.serviceItems[service] ?? [];
                                                    const nextItems = currentItems.includes(item)
                                                      ? currentItems.filter((entry) => entry !== item)
                                                      : [...currentItems, item];
                                                    return {
                                                      ...current,
                                                      serviceItems: {
                                                        ...current.serviceItems,
                                                        [service]: nextItems
                                                      }
                                                    };
                                                  })
                                                }
                                              />
                                              <div className="min-w-0">
                                                <div>{item}</div>
                                                {feeNotes.length > 0 ? (
                                                  <div className="mt-1 space-y-1">
                                                    <div className="text-[12px] leading-[1.4] text-muted-foreground">
                                                      {feeNotes.map((fee, index) => (
                                                        <span key={fee.label}>
                                                          {index > 0 ? "; " : ""}
                                                          {fee.label}:{" "}
                                                          <span className="font-semibold text-foreground">
                                                            {fee.amount}
                                                          </span>
                                                        </span>
                                                      ))}
                                                    </div>
                                                    <button
                                                      type="button"
                                                      disabled={isContractDetailReadOnly}
                                                      onClick={(event) => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        if (isContractDetailReadOnly) {
                                                          return;
                                                        }
                                                        setContractInternationalFeeDrafts((current) => ({
                                                          ...current,
                                                          [item]: current[item] ?? initialContractServiceFeeDraftForm
                                                        }));
                                                      }}
                                                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#245698] hover:text-[#1d447e]"
                                                    >
                                                      <Plus className="h-3 w-3" />
                                                      <span>Thêm loại phí</span>
                                                    </button>
                                                    {contractInternationalFeeDrafts[item] ? (
                                                      <div
                                                        className={`grid text-[14px] text-foreground ${
                                                          hasFeeDraftValue
                                                            ? "grid-cols-[1.5fr_1.2fr_1fr_auto]"
                                                            : "grid-cols-[1.5fr_1.2fr_1fr]"
                                                        }`}
                                                        onClick={(event) => {
                                                          event.preventDefault();
                                                          event.stopPropagation();
                                                        }}
                                                      >
                                                        <div className="flex items-center px-4 py-2">
                                                          <input
                                                            value={feeDraft.feeName}
                                                            readOnly={isContractDetailReadOnly}
                                                            placeholder="Tên loại phí"
                                                            onChange={(event) =>
                                                              setContractInternationalFeeDrafts((current) => ({
                                                                ...current,
                                                                [item]: {
                                                                  ...feeDraft,
                                                                  feeName: event.target.value
                                                                }
                                                              }))
                                                            }
                                                            className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                                              isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                                            }`}
                                                          />
                                                        </div>
                                                        <div className="flex items-center px-4 py-2">
                                                          <input
                                                            value={feeDraft.currency}
                                                            readOnly={isContractDetailReadOnly}
                                                            placeholder="Đơn vị tính (VD: USD, USD/Shipment,...)"
                                                            onChange={(event) =>
                                                              setContractInternationalFeeDrafts((current) => ({
                                                                ...current,
                                                                [item]: {
                                                                  ...feeDraft,
                                                                  currency: event.target.value
                                                                }
                                                              }))
                                                            }
                                                            className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                                              isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                                            }`}
                                                          />
                                                        </div>
                                                        <div className="flex items-center px-4 py-2">
                                                          <input
                                                            value={feeDraft.rate}
                                                            readOnly={isContractDetailReadOnly}
                                            placeholder="-"
                                                            inputMode="decimal"
                                                            onChange={(event) =>
                                                              setContractInternationalFeeDrafts((current) => ({
                                                                ...current,
                                                                [item]: {
                                                                  ...feeDraft,
                                                                  rate: event.target.value
                                                                }
                                                              }))
                                                            }
                                                            className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                                              isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                                            }`}
                                                          />
                                                        </div>
                                                        {hasFeeDraftValue ? (
                                                          <div className="flex items-center justify-end px-2 py-2">
                                                            <button
                                                              type="button"
                                                              disabled={isContractDetailReadOnly}
                                                              onClick={(event) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                if (isContractDetailReadOnly) {
                                                                  return;
                                                                }
                                                                setContractInternationalFeeDrafts((current) => {
                                                                  const nextDrafts = { ...current };
                                                                  delete nextDrafts[item];
                                                                  return nextDrafts;
                                                                });
                                                              }}
                                                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                                            >
                                                              <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                                            </button>
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                ) : null}
                                              </div>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-0 border-t border-[#E7E6E9]">
                          <div className="px-5 py-0">
                            {contractCreateTabs.length === 0 ? (
                              <div className="px-4 py-4 text-[13px] text-muted-foreground">
                                Chọn phạm vi dịch vụ để hiển thị tab cấu hình tương ứng.
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-end gap-0 border-b border-[#E7E6E9] pt-0">
                                  {contractCreateTabs.map((tab) => {
                                    const isActive = contractCreateWorkspaceTab === tab.key;
                                    return (
                                      <button
                                        key={tab.key}
                                        type="button"
                                          onClick={() =>
                                            setContractCreateWorkspaceTab(
                                              tab.key as "services" | "domestic" | "customs" | "warehouse" | "other" | "documents" | "notes"
                                            )
                                          }
                                        className={`inline-flex h-9 items-center border-r border-[#CDD3E3] px-4 text-[14px] font-medium ${
                                          isActive
                                            ? "border-b-2 border-b-[#4A63B8] bg-[#F3F4F6] text-foreground"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {tab.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                {contractCreateWorkspaceTab === "services" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Tên dịch vụ", "Mod", "Container", "Đơn vị tính", "Đơn vị tiền tệ", "Đơn giá"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {contractRateRows.map((row, rowIndex) => (
                                    <div
                                      key={`contract-rate-row-${rowIndex}`}
                                      className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractFareNameOptions, row.fareName) || row.fareName || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractModOptions, row.mod) || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractContainerOptions, row.container) || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractUnitOptions, row.unit) || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractCurrencyOptions, row.currency) || "-"}</div>
                                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                                        <span className="truncate">{row.rate || "-"}</span>
                                        {!isContractDetailReadOnly ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setContractRateRows((current) =>
                                                current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                              )
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                  {isContractRateFormOpen ? (
                                    <div
                                      ref={contractRateInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasContractRateDraft
                                          ? "grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr_auto]"
                                          : "grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractRateForm.fareName}
                                          options={contractFareNameOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractRateForm((current) => ({ ...current, fareName: value }))}
                                          placeholder="Chọn tên dịch vụ"
                                          dropdownWidthClass="w-[150%] min-w-[520px]"
                                          searchable
                                          searchPlaceholder="Tìm tên dịch vụ"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractRateForm.mod}
                                          options={contractModOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractRateForm((current) => ({ ...current, mod: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractRateForm.container}
                                          options={contractContainerOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractRateForm((current) => ({ ...current, container: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractRateForm.unit}
                                          options={contractUnitOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractRateForm((current) => ({ ...current, unit: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractRateForm.currency}
                                          options={contractCurrencyOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractRateForm((current) => ({ ...current, currency: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractRateForm.rate}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractRateForm((current) => ({
                                              ...current,
                                              rate: event.target.value.replace(/[^\d.]/g, "")
                                            }))
                                          }
                                          placeholder="Nhập đơn giá"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      {hasContractRateDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            disabled={isContractDetailReadOnly}
                                            onClick={() => {
                                              setContractRateForm(initialContractRateForm);
                                              setIsContractRateFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {Array.from({ length: emptyContractRateRows }).map((_, rowIndex) =>
                                    rowIndex === 0 && !isContractDetailReadOnly ? (
                                      <button
                                        key="contract-rate-add-row"
                                        type="button"
                                        disabled={isContractDetailReadOnly}
                                        className="grid w-full grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextContractRateRow}
                                      >
                                        <div className="col-span-6 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`contract-rate-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                                          <div key={`contract-rate-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                                ) : contractCreateWorkspaceTab === "domestic" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Điểm lấy hàng", "Điểm giao hàng", "Đơn vị tính", "Container", "Đơn vị tiền tệ", "Đơn giá"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {contractDomesticRows.map((row, rowIndex) => (
                                    <div
                                      key={`contract-domestic-row-${rowIndex}`}
                                      className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="px-4 py-2">{row.pickupPoint || "-"}</div>
                                      <div className="px-4 py-2">{row.deliveryPoint || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractUnitOptions, row.unit) || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractContainerOptions, row.container) || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractCurrencyOptions, row.currency) || "-"}</div>
                                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                                        <span className="truncate">{row.rate || "-"}</span>
                                        {!isContractDetailReadOnly ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setContractDomesticRows((current) =>
                                                current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                              )
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                  {isContractDomesticFormOpen ? (
                                    <div
                                      ref={contractDomesticInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasContractDomesticDraft
                                          ? "grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1fr_auto]"
                                          : "grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractDomesticForm.pickupPoint}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractDomesticForm((current) => ({ ...current, pickupPoint: event.target.value }))
                                          }
                                          placeholder="Địa chỉ lấy hàng"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractDomesticForm.deliveryPoint}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractDomesticForm((current) => ({ ...current, deliveryPoint: event.target.value }))
                                          }
                                          placeholder="Địa chỉ giao hàng"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractDomesticForm.unit}
                                          options={contractUnitOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractDomesticForm((current) => ({ ...current, unit: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractDomesticForm.container}
                                          options={contractContainerOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractDomesticForm((current) => ({ ...current, container: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractDomesticForm.currency}
                                          options={contractCurrencyOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractDomesticForm((current) => ({ ...current, currency: value }))}
                                        />
                                      </div>
                                      <div className="px-4 py-2">
                                        <input
                                          value={contractDomesticForm.rate}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractDomesticForm((current) => ({
                                              ...current,
                                              rate: event.target.value.replace(/[^\d.]/g, "")
                                            }))
                                          }
                                          placeholder="Nhập đơn giá"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      {hasContractDomesticDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            disabled={isContractDetailReadOnly}
                                            onClick={() => {
                                              setContractDomesticForm(initialContractDomesticForm);
                                              setIsContractDomesticFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {Array.from({ length: emptyContractDomesticRows }).map((_, rowIndex) =>
                                    rowIndex === 0 && !isContractDetailReadOnly ? (
                                      <button
                                        key="contract-domestic-add-row"
                                        type="button"
                                        disabled={isContractDetailReadOnly}
                                        className="grid w-full grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextContractDomesticRow}
                                      >
                                        <div className="col-span-6 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`contract-domestic-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 6 }).map((__, cellIndex) => (
                                          <div key={`contract-domestic-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                                ) : contractCreateWorkspaceTab === "customs" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Loại dịch vụ", "Đơn vị tính", "Đơn vị tiền tệ", "Đơn giá"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {contractCustomsRows.map((row, rowIndex) => (
                                    <div
                                      key={`contract-customs-row-${rowIndex}`}
                                      className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="flex items-center px-4 py-2">{row.serviceName || "-"}</div>
                                      {row.isPreset ? (
                                        <>
                                          <div className="flex items-center px-4 py-2">
                                            <TableDropdownField
                                              value={row.unit}
                                              options={contractUnitOptions}
                                              disabled={isContractDetailReadOnly}
                                              onChange={(value) =>
                                                setContractCustomsRows((current) =>
                                                  current.map((currentRow, currentIndex) =>
                                                    currentIndex === rowIndex ? { ...currentRow, unit: value } : currentRow
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="flex items-center px-4 py-2">
                                            <TableDropdownField
                                              value={row.currency}
                                              options={contractCurrencyOptions}
                                              disabled={isContractDetailReadOnly}
                                              onChange={(value) =>
                                                setContractCustomsRows((current) =>
                                                  current.map((currentRow, currentIndex) =>
                                                    currentIndex === rowIndex ? { ...currentRow, currency: value } : currentRow
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="flex items-center justify-between gap-2 px-4 py-2">
                                            <input
                                              value={row.rate}
                                              readOnly={isContractDetailReadOnly}
                                              onChange={(event) =>
                                                setContractCustomsRows((current) =>
                                                  current.map((currentRow, currentIndex) =>
                                                    currentIndex === rowIndex
                                                      ? {
                                                          ...currentRow,
                                                          rate: event.target.value.replace(/[^\d.]/g, "")
                                                        }
                                                      : currentRow
                                                  )
                                                )
                                              }
                                              placeholder="Nhập đơn giá"
                                              className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                                isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                              }`}
                                            />
                                            {!isContractDetailReadOnly ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setContractCustomsRows((current) =>
                                                    current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                                  )
                                                }
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                              >
                                                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                              </button>
                                            ) : null}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="px-4 py-2">{resolveSelectOptionLabel(contractUnitOptions, row.unit) || "-"}</div>
                                          <div className="px-4 py-2">{resolveSelectOptionLabel(contractCurrencyOptions, row.currency) || "-"}</div>
                                          <div className="flex items-center justify-between gap-2 px-4 py-2">
                                            <span className="truncate">{row.rate || "-"}</span>
                                            {!isContractDetailReadOnly ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setContractCustomsRows((current) =>
                                                    current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                                  )
                                                }
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                              >
                                                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                              </button>
                                            ) : null}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                  {isContractCustomsFormOpen ? (
                                    <div
                                      ref={contractCustomsInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasContractCustomsDraft
                                          ? "grid-cols-[1.6fr_1fr_1fr_1fr_auto]"
                                          : "grid-cols-[1.6fr_1fr_1fr_1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractCustomsForm.serviceName}
                                          options={(selectedCustomsServiceItems.length > 0
                                            ? selectedCustomsServiceItems
                                            : contractDisplayServiceItemOptions["📑 Thủ tục hải quan"] ?? []
                                          ).map((item) => ({
                                            label: item,
                                            value: item
                                          }))}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractCustomsForm((current) => ({ ...current, serviceName: value }))}
                                          placeholder="Chọn loại dịch vụ"
                                          placeholderClassName="text-foreground"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractCustomsForm.unit}
                                          options={contractUnitOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractCustomsForm((current) => ({ ...current, unit: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractCustomsForm.currency}
                                          options={contractCurrencyOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractCustomsForm((current) => ({ ...current, currency: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractCustomsForm.rate}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractCustomsForm((current) => ({
                                              ...current,
                                              rate: event.target.value.replace(/[^\d.]/g, "")
                                            }))
                                          }
                                          placeholder="Nhập đơn giá"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      {hasContractCustomsDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            disabled={isContractDetailReadOnly}
                                            onClick={() => {
                                              setContractCustomsForm(initialContractCustomsForm);
                                              setIsContractCustomsFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {Array.from({ length: emptyContractCustomsRows }).map((_, rowIndex) =>
                                    rowIndex === 0 && !isContractDetailReadOnly ? (
                                      <button
                                        key="contract-customs-add-row"
                                        type="button"
                                        disabled={isContractDetailReadOnly}
                                        className="grid w-full grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextContractCustomsRow}
                                      >
                                        <div className="col-span-4 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`contract-customs-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 4 }).map((__, cellIndex) => (
                                          <div key={`contract-customs-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                                ) : contractCreateWorkspaceTab === "warehouse" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Loại dịch vụ", "Đơn vị tính", "Đơn vị tiền tệ", "Đơn giá"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {contractWarehouseRows.map((row, rowIndex) => (
                                    <div
                                      key={`contract-warehouse-row-${rowIndex}`}
                                      className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="flex items-center px-4 py-2">{row.serviceName || "-"}</div>
                                      {row.isPreset ? (
                                        <>
                                          <div className="flex items-center px-4 py-2">
                                            <TableDropdownField
                                              value={row.unit}
                                              options={contractUnitOptions}
                                              disabled={isContractDetailReadOnly}
                                              onChange={(value) =>
                                                setContractWarehouseRows((current) =>
                                                  current.map((currentRow, currentIndex) =>
                                                    currentIndex === rowIndex ? { ...currentRow, unit: value } : currentRow
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="flex items-center px-4 py-2">
                                            <TableDropdownField
                                              value={row.currency}
                                              options={contractCurrencyOptions}
                                              disabled={isContractDetailReadOnly}
                                              onChange={(value) =>
                                                setContractWarehouseRows((current) =>
                                                  current.map((currentRow, currentIndex) =>
                                                    currentIndex === rowIndex ? { ...currentRow, currency: value } : currentRow
                                                  )
                                                )
                                              }
                                            />
                                          </div>
                                          <div className="flex items-center justify-between gap-2 px-4 py-2">
                                            <input
                                              value={row.rate}
                                              readOnly={isContractDetailReadOnly}
                                              onChange={(event) =>
                                                setContractWarehouseRows((current) =>
                                                  current.map((currentRow, currentIndex) =>
                                                    currentIndex === rowIndex
                                                      ? {
                                                          ...currentRow,
                                                          rate: event.target.value.replace(/[^\d.]/g, "")
                                                        }
                                                      : currentRow
                                                  )
                                                )
                                              }
                                              placeholder="Nhập đơn giá"
                                              className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                                isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                              }`}
                                            />
                                            {!isContractDetailReadOnly ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setContractWarehouseRows((current) =>
                                                    current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                                  )
                                                }
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                              >
                                                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                              </button>
                                            ) : null}
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="px-4 py-2">{resolveSelectOptionLabel(contractUnitOptions, row.unit) || "-"}</div>
                                          <div className="px-4 py-2">{resolveSelectOptionLabel(contractCurrencyOptions, row.currency) || "-"}</div>
                                          <div className="flex items-center justify-between gap-2 px-4 py-2">
                                            <span className="truncate">{row.rate || "-"}</span>
                                            {!isContractDetailReadOnly ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setContractWarehouseRows((current) =>
                                                    current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                                  )
                                                }
                                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                              >
                                                <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                              </button>
                                            ) : null}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                  {isContractWarehouseFormOpen ? (
                                    <div
                                      ref={contractWarehouseInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasContractWarehouseDraft
                                          ? "grid-cols-[1.6fr_1fr_1fr_1fr_auto]"
                                          : "grid-cols-[1.6fr_1fr_1fr_1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractWarehouseForm.serviceName}
                                          options={(selectedWarehouseServiceItems.length > 0
                                            ? selectedWarehouseServiceItems
                                            : contractDisplayServiceItemOptions["🏭 Kho bãi & phân phối"] ?? []
                                          ).map((item) => ({
                                            label: item,
                                            value: item
                                          }))}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractWarehouseForm((current) => ({ ...current, serviceName: value }))}
                                          placeholder="Chọn loại dịch vụ"
                                          placeholderClassName="text-foreground"
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractWarehouseForm.unit}
                                          options={contractUnitOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractWarehouseForm((current) => ({ ...current, unit: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractWarehouseForm.currency}
                                          options={contractCurrencyOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractWarehouseForm((current) => ({ ...current, currency: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractWarehouseForm.rate}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractWarehouseForm((current) => ({
                                              ...current,
                                              rate: event.target.value.replace(/[^\d.]/g, "")
                                            }))
                                          }
                                          placeholder="Nhập đơn giá"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      {hasContractWarehouseDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            disabled={isContractDetailReadOnly}
                                            onClick={() => {
                                              setContractWarehouseForm(initialContractWarehouseForm);
                                              setIsContractWarehouseFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {Array.from({ length: emptyContractWarehouseRows }).map((_, rowIndex) =>
                                    rowIndex === 0 && !isContractDetailReadOnly ? (
                                      <button
                                        key="contract-warehouse-add-row"
                                        type="button"
                                        disabled={isContractDetailReadOnly}
                                        className="grid w-full grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextContractWarehouseRow}
                                      >
                                        <div className="col-span-4 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`contract-warehouse-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 4 }).map((__, cellIndex) => (
                                          <div key={`contract-warehouse-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                                ) : contractCreateWorkspaceTab === "other" ? (
                              <div className="space-y-0 pt-0 pb-4">
                                <div>
                                  <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["Loại dịch vụ", "Đơn vị tính", "Đơn vị tiền tệ", "Đơn giá"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {contractOtherRows.map((row, rowIndex) => (
                                    <div
                                      key={`contract-other-row-${rowIndex}`}
                                      className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="flex items-center px-4 py-2">{row.serviceName || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractUnitOptions, row.unit) || "-"}</div>
                                      <div className="px-4 py-2">{resolveSelectOptionLabel(contractCurrencyOptions, row.currency) || "-"}</div>
                                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                                        <span className="truncate">{row.rate || "-"}</span>
                                        {!isContractDetailReadOnly ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setContractOtherRows((current) =>
                                                current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                              )
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                  {isContractOtherFormOpen ? (
                                    <div
                                      ref={contractOtherInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasContractOtherDraft
                                          ? "grid-cols-[1.6fr_1fr_1fr_1fr_auto]"
                                          : "grid-cols-[1.6fr_1fr_1fr_1fr]"
                                      }`}
                                    >
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractOtherForm.serviceName}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractOtherForm((current) => ({ ...current, serviceName: event.target.value }))
                                          }
                                          placeholder="Nhập loại dịch vụ"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractOtherForm.unit}
                                          options={contractUnitOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractOtherForm((current) => ({ ...current, unit: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <TableDropdownField
                                          value={contractOtherForm.currency}
                                          options={contractCurrencyOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) => setContractOtherForm((current) => ({ ...current, currency: value }))}
                                        />
                                      </div>
                                      <div className="flex items-center px-4 py-2">
                                        <input
                                          value={contractOtherForm.rate}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractOtherForm((current) => ({
                                              ...current,
                                              rate: event.target.value.replace(/[^\d.]/g, "")
                                            }))
                                          }
                                          placeholder="Nhập đơn giá"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      {hasContractOtherDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            disabled={isContractDetailReadOnly}
                                            onClick={() => {
                                              setContractOtherForm(initialContractOtherForm);
                                              setIsContractOtherFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {Array.from({ length: emptyContractOtherRows }).map((_, rowIndex) =>
                                    rowIndex === 0 && !isContractDetailReadOnly ? (
                                      <button
                                        key="contract-other-add-row"
                                        type="button"
                                        disabled={isContractDetailReadOnly}
                                        className="grid w-full grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextContractOtherRow}
                                      >
                                        <div className="col-span-4 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`contract-other-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 4 }).map((__, cellIndex) => (
                                          <div key={`contract-other-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                                ) : null}
                              </>
                            )}
                            {contractCreateTabs.length === 0 ? null : contractCreateWorkspaceTab === "documents" ? (
                              <div className="space-y-0 px-4 pt-0 pb-4">
                                <input
                                  ref={contractDocumentUploadInputRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  disabled={isContractDetailReadOnly}
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file?.name) {
                                      return;
                                    }

                                    setContractDocumentForm((current) => ({
                                      ...current,
                                      fileName: file.name,
                                      documentName: current.documentName || file.name.replace(/\.[^.]+$/, ""),
                                      uploadedBy: currentUserName
                                    }));
                                    event.currentTarget.value = "";
                                  }}
                                />
                                <div>
                                  <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                    {["File HĐ chính thức", "Loại tài liệu", "Tên tài liệu", "Ngày tài liệu", "Upload bởi"].map((label) => (
                                      <div key={label} className="whitespace-nowrap px-4 py-3">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {contractDocumentRows.map((row, rowIndex) => (
                                    <div
                                      key={`contract-document-row-${rowIndex}`}
                                      className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="truncate px-4 py-2">{row.fileName || "-"}</div>
                                      <div className="px-4 py-2">{row.documentType || "-"}</div>
                                      <div className="px-4 py-2">{row.documentName || "-"}</div>
                                      <div className="px-4 py-2">{row.documentDate || "-"}</div>
                                      <div className="flex items-center justify-between gap-2 px-4 py-2">
                                        <span className="truncate">{row.uploadedBy || "-"}</span>
                                        {!isContractDetailReadOnly ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setContractDocumentRows((current) =>
                                                current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                              )
                                            }
                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        ) : null}
                                      </div>
                                    </div>
                                  ))}
                                  {isContractDocumentFormOpen ? (
                                    <div
                                      ref={contractDocumentInlineFormRef}
                                      className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                        hasContractDocumentDraft
                                          ? "grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]"
                                          : "grid-cols-[1.3fr_1fr_1fr_1fr_1fr]"
                                      }`}
                                    >
                                      <div className="px-4 py-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!isContractDetailReadOnly) {
                                              contractDocumentUploadInputRef.current?.click();
                                            }
                                          }}
                                          className={`flex h-10 w-full items-center gap-2 border-b border-transparent bg-transparent px-0 text-left text-[15px] text-foreground outline-none transition-colors ${
                                            isContractDetailReadOnly ? "cursor-default" : "hover:border-black"
                                          }`}
                                        >
                                          <Upload className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                                          <span className={contractDocumentForm.fileName ? "truncate text-foreground" : "truncate text-[#9CA3AF]"}>
                                            {contractDocumentForm.fileName || "Chọn file"}
                                          </span>
                                        </button>
                                      </div>
                                      <div className="px-4 py-2">
                                        <TableDropdownField
                                          heightClass="h-10"
                                          textSizeClass="text-[15px]"
                                          value={contractDocumentForm.documentType}
                                          options={contractDocumentTypeOptions}
                                          disabled={isContractDetailReadOnly}
                                          onChange={(value) =>
                                            setContractDocumentForm((current) => ({ ...current, documentType: value }))
                                          }
                                          placeholder="Chọn loại"
                                        />
                                      </div>
                                      <div className="px-4 py-2">
                                        <input
                                          value={contractDocumentForm.documentName}
                                          readOnly={isContractDetailReadOnly}
                                          onChange={(event) =>
                                            setContractDocumentForm((current) => ({
                                              ...current,
                                              documentName: event.target.value
                                            }))
                                          }
                                          placeholder="Tên tài liệu"
                                          className={`h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] ${
                                            isContractDetailReadOnly ? "cursor-default" : "focus:border-black"
                                          }`}
                                        />
                                      </div>
                                      <div className="px-4 py-2">
                                        <InlineCompactDateField
                                          value={contractDocumentForm.documentDate}
                                          onChange={(value) =>
                                            setContractDocumentForm((current) => ({ ...current, documentDate: value }))
                                          }
                                          textSizeClass="text-[15px]"
                                          heightClass="h-10"
                                          readOnly={isContractDetailReadOnly}
                                        />
                                      </div>
                                      <div className="px-4 py-2">
                                        <div className="flex h-10 items-center text-[15px] text-foreground">
                                          {contractDocumentForm.uploadedBy || currentUserName}
                                        </div>
                                      </div>
                                      {hasContractDocumentDraft ? (
                                        <div className="flex items-center justify-end px-2 py-2">
                                          <button
                                            type="button"
                                            disabled={isContractDetailReadOnly}
                                            onClick={() => {
                                              setContractDocumentForm(initialContractDocumentForm);
                                              setIsContractDocumentFormOpen(false);
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698] disabled:cursor-default disabled:opacity-40"
                                          >
                                            <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {Array.from({ length: emptyContractDocumentRows }).map((_, rowIndex) =>
                                    rowIndex === 0 && !isContractDetailReadOnly ? (
                                      <button
                                        key="contract-document-add-row"
                                        type="button"
                                        disabled={isContractDetailReadOnly}
                                        className="grid w-full grid-cols-[1.3fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                        onClick={openNextContractDocumentRow}
                                      >
                                        <div className="col-span-5 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          Thêm một dòng
                                        </div>
                                      </button>
                                    ) : (
                                      <div
                                        key={`contract-document-empty-row-${rowIndex}`}
                                        className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD]"
                                      >
                                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                                          <div key={`contract-document-empty-cell-${rowIndex}-${cellIndex}`} className="h-[36px] px-4 py-2" />
                                        ))}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : contractCreateWorkspaceTab === "notes" ? (
                              <div className="px-4 py-4">
                                <div className="max-w-[980px] space-y-3">
                                  <TiptapRichTextEditor
                                    value={contractCreateForm.notes}
                                    onChange={(value) => setContractCreateForm((current) => ({ ...current, notes: value }))}
                                    placeholder="Ghi chú nội bộ. Điều khoản đặc biệt không in trên HĐ chính thức"
                                    readOnly={isContractDetailReadOnly}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-4">
                    <div className="space-y-5">
                      {contractCreateActivityGroups.map((group) => (
                        <div key={group.label}>
                          <div className="relative flex items-center justify-center">
                            <div className="absolute inset-x-0 top-1/2 h-[0.5px] -translate-y-1/2 bg-[#E7E6E9]" />
                            <div className="relative bg-background px-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{group.label}</div>
                          </div>
                          <div className="mt-4 space-y-3">
                            {group.entries.map((entry, index) => (
                              <div key={`${entry.actor}-${index}`} className="flex items-start gap-3">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-white ${getAvatarColorClass(entry.actor)}`}>
                                  {entry.actor.trim().charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">
                                    <span>{entry.actor}</span>
                                    <span className="text-[12px] font-normal text-muted-foreground">{entry.time}</span>
                                  </div>
                                  <div className="mt-1 text-[14px] text-foreground">{entry.message}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isCustomerContractsPage ? (
              <>
                <div className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col">
                  <div
                    className="grid shrink-0 border-b border-border bg-card"
                    style={{
                      gridTemplateColumns: contractTableColumns,
                      paddingRight: contractTableScrollbarWidth ? `${contractTableScrollbarWidth}px` : undefined
                    }}
                  >
                    {["Số HĐ", "Khách hàng", "Loại HĐ", "Dịch vụ", "Ngày hiệu lực", "Ngày hết hạn", "Trạng thái"].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`flex h-11 w-full min-w-0 items-center justify-start text-left text-sm font-normal text-muted-foreground ${
                          index === 0 ? "pl-6 pr-4" : "px-4"
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <div ref={contractTableBodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                    {paginatedContractRows.length > 0 ? (
                      paginatedContractRows.map((row, index, filteredRows) => (
                          <div
                            key={row.code}
                            className="group grid cursor-pointer bg-card transition-colors hover:bg-[#B6E1FF]"
                            style={{ gridTemplateColumns: contractTableColumns }}
                            role="button"
                            tabIndex={0}
                            onClick={() => openContractDetails(row.code)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openContractDetails(row.code);
                              }
                            }}
                          >
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden pl-6 pr-4 text-left text-sm font-semibold text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <span className="block truncate whitespace-nowrap">{row.code}</span>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openCustomerDetails(row.customer);
                                }}
                                className="block truncate whitespace-nowrap text-left text-[#245698] transition-colors hover:text-[#1b467d] hover:underline"
                              >
                                {row.customer}
                              </button>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-foreground">
                                {row.contractType}
                              </span>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <span className="block truncate whitespace-nowrap">{formatContractServiceLabels(row.services)}</span>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <span className="block truncate whitespace-nowrap">{row.term.split(" - ")[0] ?? row.term}</span>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <span className={`block truncate whitespace-nowrap ${getContractExpiryTextClass(row)}`}>
                                {row.status === "draft" ? "-" : row.term.split(" - ")[1] ?? row.term}
                              </span>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <ContractStatusTag status={row.status} />
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
                        Không có hợp đồng phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:hidden">
                  <div className="grid gap-3">
                    {paginatedContractRows.map((row) => (
                      <article
                        key={row.code}
                        className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-[#B6E1FF]"
                        role="button"
                        tabIndex={0}
                        onClick={() => openContractDetails(row.code)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openContractDetails(row.code);
                          }
                        }}
                      >
                        <div className="text-sm font-semibold text-foreground">{row.code}</div>
                        <div className="mt-3 space-y-2 text-sm text-foreground">
                          <div>
                            <span className="text-muted-foreground">Khách hàng: </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openCustomerDetails(row.customer);
                              }}
                              className="text-[#245698] transition-colors hover:text-[#1b467d] hover:underline"
                            >
                              {row.customer}
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">Loại HĐ: </span>
                            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-foreground">
                              {row.contractType}
                            </span>
                          </div>
                          <div><span className="text-muted-foreground">Dịch vụ: </span>{formatContractServiceLabels(row.services)}</div>
                          <div>
                            <span className="text-muted-foreground">Ngày hết hạn: </span>
                            <span className={getContractExpiryTextClass(row)}>
                              {row.status === "draft" ? "-" : row.term.split(" - ")[1] ?? row.term}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Trạng thái: </span>
                            <span className="inline-flex align-middle">
                              <ContractStatusTag status={row.status} />
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {isCustomerServicesPage ? (
              <>
                <div className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col">
                  <div
                    className="grid shrink-0 border-b border-border bg-card"
                    style={{
                      gridTemplateColumns: serviceConfigTableColumns,
                      paddingRight: serviceConfigTableScrollbarWidth ? `${serviceConfigTableScrollbarWidth}px` : undefined
                    }}
                  >
                    {["Mã loại hình", "Loại hình", "Số lượng phí", "Người tạo"].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`flex h-11 w-full min-w-0 items-center justify-start text-left text-sm font-normal text-muted-foreground ${
                          index === 0 ? "pl-6 pr-4" : "px-4"
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <div ref={serviceConfigTableBodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                    {paginatedServiceConfigRows.length > 0 ? (
                      paginatedServiceConfigRows.map((row, index) => (
                        <div
                          key={`${row.service}-${row.item}`}
                          className="grid cursor-pointer bg-card transition-colors hover:bg-[#B6E1FF]"
                          style={{ gridTemplateColumns: serviceConfigTableColumns }}
                          role="button"
                          tabIndex={0}
                          onClick={() => openServiceDetails(row.service as ServicePageScope, row.item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openServiceDetails(row.service as ServicePageScope, row.item);
                            }
                          }}
                        >
                          <div className={`flex min-h-[34px] w-full min-w-0 items-center justify-start pl-6 pr-4 text-left text-sm font-semibold text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.serviceCode}
                          </div>
                          <div className={`flex min-h-[34px] w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.item}</span>
                          </div>
                          <div className={`flex min-h-[34px] w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.feeCount}
                          </div>
                          <div className={`flex min-h-[34px] w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.createdBy}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
                        Không có dịch vụ phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:hidden">
                  <div className="grid gap-3">
                    {paginatedServiceConfigRows.length > 0 ? (
                      paginatedServiceConfigRows.map((row) => (
                        <article
                          key={`${row.service}-${row.item}`}
                          className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-[#B6E1FF]"
                          role="button"
                          tabIndex={0}
                          onClick={() => openServiceDetails(row.service as ServicePageScope, row.item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openServiceDetails(row.service as ServicePageScope, row.item);
                            }
                          }}
                        >
                          <div className="text-sm font-semibold text-foreground">{row.serviceCode}</div>
                          <div className="mt-3 space-y-2 text-sm text-foreground">
                            <div>
                              <span className="text-muted-foreground">Loại hình: </span>
                              {row.item}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Số lượng phí: </span>
                              {row.feeCount}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Người tạo: </span>
                              {row.createdBy}
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                        Không có dịch vụ phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {isCustomerShipmentListPage ? (
              <>
                <div className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col">
                  <div
                    className="grid shrink-0 border-b border-border bg-card"
                    style={{ gridTemplateColumns: shipmentListTableColumns }}
                  >
                    {["Shipment ID", "Khách hàng", "Tuyến vận chuyển", "Loại hàng", "Đóng gói", "Ngày tạo"].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`flex h-11 w-full min-w-0 items-center justify-start text-left text-sm font-normal text-muted-foreground ${
                          index === 0 ? "pl-6 pr-4" : "px-4"
                        }`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                    {paginatedShipmentListRows.length > 0 ? (
                      paginatedShipmentListRows.map((row, index) => {
                        const isActiveShipmentRow = selectedShipmentCode === row.code;
                        return (
                        <div
                          key={`shipment-list-${row.code}`}
                          className={`grid cursor-pointer transition-colors hover:bg-[#B6E1FF] ${isActiveShipmentRow ? "bg-[#B6E1FF]" : "bg-card"}`}
                          style={{ gridTemplateColumns: shipmentListTableColumns }}
                          role="button"
                          tabIndex={0}
                          onClick={() => openShipmentWorkspace(row.code)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openShipmentWorkspace(row.code);
                            }
                          }}
                        >
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden pl-6 pr-4 text-left text-sm font-semibold text-foreground ${index === paginatedShipmentListRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{formatShipmentCodeFromBooking(row.code)}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedShipmentListRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.customer}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedShipmentListRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <RouteCell {...row.route} />
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedShipmentListRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.cargoType}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedShipmentListRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.packaging}</span>
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === paginatedShipmentListRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <span className="block truncate whitespace-nowrap">{row.createdAt}</span>
                          </div>
                        </div>
                      )})
                    ) : (
                      <div className="flex h-full min-h-[220px] items-center justify-center bg-card px-6 text-center text-sm text-muted-foreground">
                        Không có shipment phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 min-h-0 flex-1 overflow-y-auto lg:hidden">
                  <div className="grid gap-3">
                    {paginatedShipmentListRows.length > 0 ? (
                      paginatedShipmentListRows.map((row) => (
                        <article
                          key={`shipment-mobile-${row.code}`}
                          className={`rounded-2xl border border-border p-4 transition-colors hover:bg-[#B6E1FF] ${selectedShipmentCode === row.code ? "bg-[#B6E1FF]" : "bg-card"}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => openShipmentWorkspace(row.code)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openShipmentWorkspace(row.code);
                            }
                          }}
                        >
                          <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                            {formatShipmentCodeFromBooking(row.code)}
                          </div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{row.customer}</div>
                          <div className="mt-3 space-y-2 text-sm text-foreground">
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground">Tuyến vận chuyển:</span>
                              <span className="min-w-0"><RouteCell {...row.route} className="text-sm" /></span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Loại hàng: </span>
                              {row.cargoType}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Đóng gói: </span>
                              {row.packaging}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Ngày tạo: </span>
                              {row.createdAt}
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
                        Không có shipment phù hợp với từ khóa tìm kiếm.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            {isCustomerShipmentDetailsPage ? (
              <div className="mt-3 pr-1 pb-3">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                        >
                          Lưu nháp
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                        >
                          Tạo Shipment →
                        </button>
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        Tự động lưu nháp mỗi 30 giây · Lần cuối: 14:32:05
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                      {shipmentDetailWorkflowSteps.map((step, index) => (
                        <div
                          key={step}
                          className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                            index === 0 ? "bg-[#2054a3] text-white" : "bg-[#EAF1FB] text-[#245698]"
                          } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-3">
                    <div className="flex items-center gap-2 text-[14px] text-foreground">
                      <span className="text-muted-foreground">Shipment ID</span>
                      <span className="font-medium">{shipmentDetailNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-foreground">
                      <span className="text-muted-foreground">Ngày tạo</span>
                      <span className="font-medium">
                        {shipmentDetailCreatedAt
                          ? new Date(shipmentDetailCreatedAt).toLocaleDateString("en-GB")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[14px] text-foreground">
                      <span className="text-muted-foreground">Người tạo</span>
                      <span className="font-medium">{shipmentDetailCreatedBy}</span>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div className="space-y-3">
                          <div className="border-b-[0.5px] border-[#E7E6E9] pb-3 text-[20px] font-medium text-foreground">THÔNG TIN KHÁCH HÀNG</div>
                          <div className="space-y-0">
                            <InlineFieldShell label="Tên Công ty Khách hàng" labelWidthClass="grid-cols-[220px_minmax(0,1fr)]">
                              <div ref={shipmentDetailCustomerFieldRef} className="relative">
                                <input
                                  value={shipmentDetailCustomerName}
                                  onFocus={() => setIsShipmentDetailCustomerDropdownOpen(true)}
                                  onChange={(event) => {
                                    setShipmentDetailCustomerName(event.target.value);
                                    setIsShipmentDetailCustomerDropdownOpen(true);
                                  }}
                                  className="min-h-[36px] w-full border-0 border-b-0 bg-transparent px-0 text-[15px] text-foreground outline-none transition placeholder:text-[#C0C5D2]"
                                />
                                {isShipmentDetailCustomerDropdownOpen ? (
                                  <div className="absolute left-0 top-full z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-[12px] border border-[#DADCE3] bg-[#f7f7f7] shadow-[0_12px_24px_rgba(17,17,17,0.12)]">
                                    {filteredShipmentDetailCustomerOptions.length > 0 ? (
                                      filteredShipmentDetailCustomerOptions.map((customer, index) => (
                                        <button
                                          key={customer}
                                          type="button"
                                          onMouseDown={(event) => {
                                            event.preventDefault();
                                            const selectedCustomer = customerRows.find((row) => row.customer === customer);
                                            setShipmentDetailCustomerName(customer);
                                            if (selectedCustomer) {
                                              setShipmentDetailCustomerContact(selectedCustomer.contactName);
                                            }
                                            setIsShipmentDetailCustomerDropdownOpen(false);
                                          }}
                                          className={`flex w-full items-center px-3 py-2 text-left text-[14px] text-foreground transition-colors hover:bg-[#B6E1FF] ${
                                            index === 0 ? "" : "border-t border-[#E7E6E9]"
                                          }`}
                                        >
                                          {customer}
                                        </button>
                                      ))
                                    ) : shipmentDetailCustomerName.trim() ? (
                                      <div className="px-3 py-2 text-[14px] text-muted-foreground">
                                        Tạo khách hàng mới: {shipmentDetailCustomerName.trim()}
                                      </div>
                                    ) : (
                                      <div className="px-3 py-2 text-[14px] text-muted-foreground">Nhập để tìm khách hàng</div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </InlineFieldShell>
                            <InlineFieldShell label="Người liên hệ KH" labelWidthClass="grid-cols-[220px_minmax(0,1fr)]">
                              <input
                                value={shipmentDetailCustomerContact}
                                onChange={(event) => setShipmentDetailCustomerContact(event.target.value)}
                                className="min-h-[36px] w-full border-0 border-b-0 bg-transparent px-0 text-[15px] text-foreground outline-none transition placeholder:text-[#C0C5D2]"
                              />
                            </InlineFieldShell>
                            <InlineFieldShell label="Địa chỉ" labelWidthClass="grid-cols-[220px_minmax(0,1fr)]">
                              <input
                                value={shipmentDetailCustomerAddress}
                                onChange={(event) => setShipmentDetailCustomerAddress(event.target.value)}
                                className="min-h-[36px] w-full border-0 border-b-0 bg-transparent px-0 text-[15px] text-foreground outline-none transition placeholder:text-[#C0C5D2]"
                              />
                            </InlineFieldShell>
                            <FormField
                              label="Nhân viên phụ trách"
                              value={shipmentDetailAssignedStaff}
                              onChange={setShipmentDetailAssignedStaff}
                              options={shipmentDetailStaffOptions}
                              placeholder="— Chọn nhân viên CS —"
                              variant="inlineUnderline"
                              autoSelectFirstOption={false}
                              labelWidthClass="grid-cols-[220px_minmax(0,1fr)]"
                            />
                          </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div className="space-y-3">
                          <div className="border-b-[0.5px] border-[#E7E6E9] pb-3 text-[20px] font-medium text-foreground">LÔ HÀNG</div>
                          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] lg:items-start">
                            <div className="space-y-2">
                              <div className="text-[15px] font-semibold uppercase tracking-[0.02em] text-foreground">POL - Cảng xếp hàng</div>
                              <div className="rounded-[10px] border border-[#E7E6E9] bg-[#FAFBFC] px-4 py-2.5">
                                <div className="flex items-center gap-3 border-b border-transparent focus-within:border-black">
                                  <div className="min-w-0 flex-1">
                                    <TableDropdownField
                                      value={shipmentDetailPol}
                                      options={shipmentDetailPolOptions}
                                      onChange={(value) => {
                                        const nextOption = shipmentDetailPolOptions.find((option) => option.value === value);
                                        setShipmentDetailPol(value);
                                        setShipmentDetailPolSub(nextOption?.meta ?? "");
                                      }}
                                      textSizeClass="text-[15px]"
                                      heightClass="h-8"
                                      dropdownWidthClass="w-full min-w-full"
                                      searchable
                                      searchPlaceholder="Tìm cảng xếp"
                                      placeholder="Chọn POL"
                                      placeholderClassName="text-[#C0C5D2]"
                                    />
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                                  <span className="inline-flex items-center rounded-full bg-[#EAF1FB] px-2 py-0.5 font-medium text-[#245698]">POL</span>
                                  <span className="text-[13px]">{selectedShipmentDetailPol.flag}</span>
                                  <span>{selectedShipmentDetailPol.meta}</span>
                                </div>
                              </div>
                            </div>
                            <div className="hidden lg:flex lg:justify-center lg:pt-[32px]">
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E7E6E9] bg-white text-muted-foreground transition hover:bg-[#F5F7FA] hover:text-[#245698]"
                                aria-label="Hoán đổi cảng"
                              >
                                <ArrowLeftRight className="h-4 w-4" strokeWidth={1.8} />
                              </button>
                            </div>
                            <div className="space-y-2">
                              <div className="text-[15px] font-semibold uppercase tracking-[0.02em] text-foreground">POD - Cảng dỡ hàng</div>
                              <div className="rounded-[10px] border border-[#E7E6E9] bg-[#FAFBFC] px-4 py-2.5">
                                <div className="flex items-center gap-3 border-b border-transparent focus-within:border-black">
                                  <div className="min-w-0 flex-1">
                                    <TableDropdownField
                                      value={shipmentDetailPod}
                                      options={shipmentDetailPodOptions}
                                      onChange={(value) => {
                                        const nextOption = shipmentDetailPodOptions.find((option) => option.value === value);
                                        setShipmentDetailPod(value);
                                        setShipmentDetailPodSub(nextOption?.meta ?? "");
                                      }}
                                      textSizeClass="text-[15px]"
                                      heightClass="h-8"
                                      dropdownWidthClass="w-full min-w-full"
                                      searchable
                                      searchPlaceholder="Tìm cảng dỡ"
                                      placeholder="Chọn POD"
                                      placeholderClassName="text-[#C0C5D2]"
                                    />
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                                  <span className="inline-flex items-center rounded-full bg-[#EAF1FB] px-2 py-0.5 font-medium text-[#245698]">POD</span>
                                  <span className="text-[13px]">{selectedShipmentDetailPod.flag}</span>
                                  <span>{selectedShipmentDetailPod.meta}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="border-b-[0.5px] border-[#E7E6E9] px-4 py-3">
                            <FormField
                              label="Commodity"
                              value={shipmentDetailCommodity}
                              onChange={setShipmentDetailCommodity}
                              variant="inlineUnderline"
                            />
                          </div>
                          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
                            <InlineFieldShell label="Chiều vận chuyển">
                              <div className="flex items-center gap-2 py-1">
                                {[
                                  { key: "export" as const, label: "Export" },
                                  { key: "import" as const, label: "Import" }
                                ].map((option) => (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setShipmentDetailDirection(option.key)}
                                    className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-[15px] font-medium transition ${
                                      shipmentDetailDirection === option.key
                                        ? "bg-[#2054a3] text-white"
                                        : "bg-[#F5F7FA] text-foreground hover:bg-[#EAF1FB]"
                                    }`}
                                  >
                                    {option.key === "export" ? (
                                      <ArrowUp className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                                    ) : (
                                      <ArrowDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.1} />
                                    )}
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </InlineFieldShell>
                            <InlineFieldShell label="Loại hàng">
                              <div className="flex items-center gap-2 py-1">
                                {(["FCL", "LCL"] as const).map((option) => (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => setShipmentDetailCargoType(option)}
                                    className={`inline-flex h-8 items-center rounded-[8px] px-3 text-[15px] font-medium transition ${
                                      shipmentDetailCargoType === option
                                        ? "bg-[#2054a3] text-white"
                                        : "bg-[#F5F7FA] text-foreground hover:bg-[#EAF1FB]"
                                    }`}
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            </InlineFieldShell>
                            <div className="space-y-0 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-x-8">
                              <FormField
                                label="ETD (ngày tàu chạy)"
                                value={shipmentDetailEtd}
                                onChange={setShipmentDetailEtd}
                                type="date"
                                placeholder="— Chọn ngày —"
                                variant="inlineUnderline"
                              />
                              <FormField
                                label="ETA (dự kiến đến)"
                                value={shipmentDetailEta}
                                onChange={setShipmentDetailEta}
                                type="date"
                                placeholder="— Chọn ngày —"
                                variant="inlineUnderline"
                              />
                            </div>
                          </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div className="space-y-2">
                          <div className="border-b-[0.5px] border-[#E7E6E9] pb-3 text-[20px] font-medium text-foreground">PHÍ VẬN CHUYỂN - CHARGES</div>
                          <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                            <div className="overflow-x-auto">
                              {shipmentDetailCargoType === "LCL" ? (
                                <div className="min-w-[1760px]">
                                  <div className="grid grid-cols-[0.45fr_0.8fr_2.2fr_0.9fr_1fr_0.7fr_1fr_1.1fr_0.9fr_0.9fr_1.2fr_1fr_1.15fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                                    {["#", "Mã phí", "Tên phí", "Vị trí", "Đơn vị", "CUR", "Đơn giá", "Min charge", "CBM", "Tấn (T)", "W/M", "Thành tiền", "Upload chứng từ"].map((label) => (
                                      <div key={label} className="px-4 py-2.5">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {shipmentDetailLclChargeGroups.map((group) => (
                                    <div key={group.group}>
                                      <div className="border-b border-[#E7E6E9] bg-[#FAFBFC] px-4 py-2 text-[15px] font-semibold text-foreground">
                                        {group.group}
                                      </div>
                                      {group.rows.map((row, rowIndex) => {
                                        const numericPrice = Number(String(row.price).replace(/,/g, "")) || 0;
                                        const numericCbm = Number(String(row.cbm).replace(/,/g, "")) || 0;
                                        const numericTon = Number(String(row.ton).replace(/,/g, "")) || 0;
                                        const numericMinCharge = Number(String(row.minCharge).replace(/[^\d.]/g, "")) || 0;
                                        const chargeBase = Math.max(numericCbm, numericTon);
                                        const total =
                                          row.wm === "không áp dụng W/M"
                                            ? 0
                                            : chargeBase > 0
                                              ? Math.max(numericPrice * chargeBase, numericMinCharge)
                                              : 0;
                                        return (
                                          <div
                                            key={`${group.group}-${row.code}-${rowIndex}`}
                                            className="grid grid-cols-[0.45fr_0.8fr_2.2fr_0.9fr_1fr_0.7fr_1fr_1.1fr_0.9fr_0.9fr_1.2fr_1fr_1.15fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[15px] text-foreground"
                                          >
                                            <div className="flex min-h-[40px] items-center px-4 py-2">{rowIndex + 1}</div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#EEF2F7] px-3 text-[15px] font-medium text-foreground">
                                                {row.code || "-"}
                                              </span>
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <input
                                                value={row.name}
                                                onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "name", event.target.value)}
                                                placeholder="Tên phí"
                                                className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                              />
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#EEF2F7] px-3 text-[15px] font-medium text-foreground">
                                                {row.location || "-"}
                                              </span>
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <input
                                                value={row.unit}
                                                onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "unit", event.target.value)}
                                                placeholder="Đơn vị"
                                                className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                              />
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <TableDropdownField
                                                value={row.currency}
                                                options={COST_CURRENCY_OPTIONS.map((currency) => ({ label: currency, value: currency }))}
                                                onChange={(value) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "currency", value)}
                                                textSizeClass="text-[15px]"
                                                heightClass="h-8"
                                                dropdownWidthClass="w-[180px]"
                                              />
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <input
                                                inputMode="decimal"
                                                value={row.price}
                                                onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "price", event.target.value.replace(/[^\d.]/g, ""))}
                                                placeholder="-"
                                                className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                              />
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <input
                                                value={row.minCharge}
                                                onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "minCharge", event.target.value)}
                                                placeholder="Min charge"
                                                className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                              />
                                            </div>
                                            {row.wm === "không áp dụng W/M" ? (
                                              <>
                                                <div className="flex min-h-[40px] items-center px-4 py-2 italic">
                                                  không áp dụng W/M
                                                </div>
                                                <div className="flex min-h-[40px] items-center px-4 py-2" />
                                                <div className="flex min-h-[40px] items-center px-4 py-2" />
                                              </>
                                            ) : (
                                              <>
                                                <div className="flex min-h-[40px] items-center px-4 py-2">
                                                  <input
                                                    inputMode="decimal"
                                                    value={row.cbm}
                                                    onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "cbm", event.target.value.replace(/[^\d.]/g, ""))}
                                                    className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                                  />
                                                </div>
                                                <div className="flex min-h-[40px] items-center px-4 py-2">
                                                  <input
                                                    inputMode="decimal"
                                                    value={row.ton}
                                                    onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "ton", event.target.value.replace(/[^\d.]/g, ""))}
                                                    className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                                  />
                                                </div>
                                                <div className="flex min-h-[40px] items-center px-4 py-2">
                                                  <input
                                                    value={row.wm}
                                                    onChange={(event) => updateShipmentDetailLclChargeRow(group.group, rowIndex, "wm", event.target.value)}
                                                    className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                                  />
                                                </div>
                                              </>
                                            )}
                                            <div className="flex min-h-[40px] items-center px-4 py-2 font-medium">
                                              {`$${shipmentDetailCurrencyFormatter.format(total)}`}
                                            </div>
                                            <div className="flex min-h-[40px] items-center px-4 py-2">
                                              <button
                                                type="button"
                                                onClick={() => shipmentDetailUploadInputRef.current?.click()}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                              >
                                                <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                                                <span>Tải lên</span>
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      <div className="border-b border-[#E7E6E9] bg-[#FCFCFD]">
                                        <button
                                          type="button"
                                          onClick={() => addShipmentDetailLclChargeRow(group.group)}
                                          className="flex h-[36px] w-full items-center gap-2 px-4 text-[14px] text-[#4A63B8] transition hover:bg-[#F8FAFF]"
                                        >
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          {group.addLabel}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="grid grid-cols-[0.45fr_0.8fr_2.2fr_0.9fr_1fr_0.7fr_1fr_1.1fr_0.9fr_0.9fr_1.2fr_1fr_1.15fr] bg-[#FAFBFC] text-[15px] text-foreground">
                                    <div className="col-span-11 border-t border-[#E7E6E9] px-4 py-2 text-right font-medium">Total (excl. VAT)</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9] px-4 py-2 text-left font-medium">{shipmentDetailChargeSummary.subtotal}</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9]" />
                                    <div className="col-span-11 border-t border-[#E7E6E9] px-4 py-2 text-right font-medium">VAT 8%</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9] px-4 py-2 text-left font-medium">+ {shipmentDetailChargeSummary.vat}</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9]" />
                                    <div className="col-span-11 border-t border-[#E7E6E9] px-4 py-2 text-right text-[18px] font-semibold text-[#D14343]">Total</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9] px-4 py-2 text-left text-[18px] font-semibold text-[#D14343]">{shipmentDetailChargeSummary.total}</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9]" />
                                  </div>
                                </div>
                              ) : (
                                <div className="min-w-[1460px]">
                                  <div className="grid grid-cols-[0.5fr_0.8fr_2fr_0.9fr_1.1fr_0.7fr_1fr_1fr_0.6fr_1fr_1.15fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                                    {["#", "Mã phí", "Tên phí", "Vị trí", "Đơn vị", "Cur", "Đơn giá", "Loại container", "SL", "Thành tiền", "Upload chứng từ"].map((label) => (
                                      <div key={label} className="px-4 py-2.5">
                                        {label}
                                      </div>
                                    ))}
                                  </div>
                                  {shipmentDetailChargeGroups.map((group) => (
                                    <div key={group.group}>
                                      <div className="border-b border-[#E7E6E9] bg-[#FAFBFC] px-4 py-2 text-[15px] font-semibold text-foreground">
                                        {group.group}
                                      </div>
                                      {group.rows.map((row, rowIndex) => (
                                        <div
                                          key={`${group.group}-${row.code}-${rowIndex}`}
                                          className="grid grid-cols-[0.5fr_0.8fr_2fr_0.9fr_1.1fr_0.7fr_1fr_1fr_0.6fr_1fr_1.15fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[15px] text-foreground"
                                        >
                                          <div className="flex min-h-[40px] items-center px-4 py-2">{rowIndex + 1}</div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#EEF2F7] px-3 text-[15px] font-medium text-foreground">
                                              {row.code || "-"}
                                            </span>
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <input
                                              value={row.name}
                                              onChange={(event) => updateShipmentDetailChargeRow(group.group, rowIndex, "name", event.target.value)}
                                              placeholder="Tên phí"
                                              className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                            />
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <span className="inline-flex min-h-[32px] items-center rounded-full bg-[#EEF2F7] px-3 text-[15px] font-medium text-foreground">
                                              {row.location || "-"}
                                            </span>
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <input
                                              value={row.unit}
                                              onChange={(event) => updateShipmentDetailChargeRow(group.group, rowIndex, "unit", event.target.value)}
                                              placeholder="Đơn vị"
                                              className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                            />
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <TableDropdownField
                                              value={row.currency}
                                              options={COST_CURRENCY_OPTIONS.map((currency) => ({ label: currency, value: currency }))}
                                              onChange={(value) => updateShipmentDetailChargeRow(group.group, rowIndex, "currency", value)}
                                              textSizeClass="text-[15px]"
                                              heightClass="h-8"
                                              dropdownWidthClass="w-[180px]"
                                            />
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <input
                                              inputMode="decimal"
                                              value={row.price}
                                              onChange={(event) => updateShipmentDetailChargeRow(group.group, rowIndex, "price", event.target.value.replace(/[^\d.]/g, ""))}
                                              placeholder="Đơn giá"
                                              className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                            />
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <input
                                              value={row.containerType}
                                              onChange={(event) => updateShipmentDetailChargeRow(group.group, rowIndex, "containerType", event.target.value)}
                                              placeholder="Loại container"
                                              className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                            />
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <input
                                              inputMode="decimal"
                                              value={row.quantity}
                                              onChange={(event) => updateShipmentDetailChargeRow(group.group, rowIndex, "quantity", event.target.value.replace(/[^\d.]/g, ""))}
                                              placeholder="SL"
                                              className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                            />
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2 font-medium">
                                            {(() => {
                                              const total =
                                                (Number(String(row.price).replace(/,/g, "")) || 0) *
                                                (Number(String(row.quantity).replace(/,/g, "")) || 0);
                                              return total > 0 ? `$${shipmentDetailCurrencyFormatter.format(total)}` : "-";
                                            })()}
                                          </div>
                                          <div className="flex min-h-[40px] items-center px-4 py-2">
                                            <button
                                              type="button"
                                              onClick={() => shipmentDetailUploadInputRef.current?.click()}
                                              className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                            >
                                              <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                                              <span>Tải lên</span>
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="border-b border-[#E7E6E9] bg-[#FCFCFD]">
                                        <button
                                          type="button"
                                          onClick={() => addShipmentDetailChargeRow(group.group)}
                                          className="flex h-[36px] w-full items-center gap-2 px-4 text-[14px] text-[#4A63B8] transition hover:bg-[#F8FAFF]"
                                        >
                                          <Plus className="h-4 w-4" strokeWidth={2.2} />
                                          {group.addLabel}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  <div className="grid grid-cols-[0.5fr_0.8fr_2fr_0.9fr_1.1fr_0.7fr_1fr_1fr_0.6fr_1fr_1.15fr] bg-[#FAFBFC] text-[15px] text-foreground">
                                    <div className="col-span-9 border-t border-[#E7E6E9] px-4 py-2 text-right font-medium">Total (excl. VAT)</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9] px-4 py-2 text-left font-medium">{shipmentDetailChargeSummary.subtotal}</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9]" />
                                    <div className="col-span-9 border-t border-[#E7E6E9] px-4 py-2 text-right font-medium">VAT 8%</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9] px-4 py-2 text-left font-medium">+ {shipmentDetailChargeSummary.vat}</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9]" />
                                    <div className="col-span-9 border-t border-[#E7E6E9] px-4 py-2 text-right text-[18px] font-semibold text-[#D14343]">Total</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9] px-4 py-2 text-left text-[18px] font-semibold text-[#D14343]">{shipmentDetailChargeSummary.total}</div>
                                    <div className="col-span-1 border-t border-[#E7E6E9]" />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div className="space-y-3">
                          <div className="border-b-[0.5px] border-[#E7E6E9] pb-3 text-[20px] font-medium text-foreground">GHI CHÚ & ĐÍNH KÈM</div>
                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-foreground">Ghi chú nội bộ</div>
                              <TiptapRichTextEditor
                                value={shipmentDetailInternalNote}
                                onChange={setShipmentDetailInternalNote}
                                placeholder="Ghi chú cho team nội bộ, không hiển thị với KH..."
                              />
                            </div>
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-foreground">Ghi chú khách hàng</div>
                              <TiptapRichTextEditor
                                value={shipmentDetailExternalNote}
                                onChange={setShipmentDetailExternalNote}
                                placeholder={`Thông tin cần thông báo cho ${shipmentDetailCustomerName || "khách hàng"}...`}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <input
                              ref={shipmentDetailUploadInputRef}
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                handleShipmentDetailAttachmentUpload(event.target.files);
                                event.currentTarget.value = "";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => shipmentDetailUploadInputRef.current?.click()}
                              className="inline-flex h-9 items-center gap-2 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                            >
                              <Plus className="h-4 w-4" strokeWidth={2.1} />
                              <span>Đính kèm tài liệu (Packing List, Commercial Invoice, Certificate of Origin, B/L draft...)</span>
                            </button>
                            {shipmentDetailAttachments.length > 0 ? (
                              <div className="space-y-2">
                                {shipmentDetailAttachments.map((file) => (
                                  <div
                                    key={file.id}
                                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[#E7E6E9] bg-[#FCFCFD] px-3 py-2 text-[13px] text-foreground"
                                  >
                                    <span className="truncate">{file.name}</span>
                                    <span className="shrink-0 text-muted-foreground">{file.sizeLabel}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div ref={shipmentDetailAuditSectionRef} className="rounded-[10px] border border-[#E7E6E9] bg-white">
                      <button
                        type="button"
                        onClick={() => setIsShipmentDetailAuditLogOpen((current) => !current)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-[15px] font-semibold text-foreground">Lịch sử thay đổi</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isShipmentDetailAuditLogOpen ? "rotate-180" : ""}`}
                          strokeWidth={1.8}
                        />
                      </button>
                      {isShipmentDetailAuditLogOpen ? (
                        <div className="border-t border-[#E7E6E9]">
                          <div className="overflow-x-auto">
                            <div className="min-w-[980px]">
                              <div className="grid grid-cols-[1fr_1.2fr_1.6fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[12px] font-medium text-muted-foreground">
                                {["Hành động", "Trường thay đổi", "Giá trị trước → sau", "Người thực hiện", "Thời gian"].map((label) => (
                                  <div key={label} className="px-4 py-2.5">
                                    {label}
                                  </div>
                                ))}
                              </div>
                              {shipmentDetailAuditRows.map((row) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[1fr_1.2fr_1.6fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] text-foreground"
                                >
                                  <div className="flex min-h-[38px] items-center px-4">{row.action}</div>
                                  <div className="flex min-h-[38px] items-center px-4">{row.field}</div>
                                  <div className="flex min-h-[38px] items-center px-4">
                                    <span className="truncate">{row.beforeValue}</span>
                                    <span className="mx-2 text-muted-foreground">→</span>
                                    <span className="truncate">{row.afterValue}</span>
                                  </div>
                                  <div className="flex min-h-[38px] items-center px-4">{row.actor}</div>
                                  <div className="flex min-h-[38px] items-center px-4 text-[#4B5563]">{row.time}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                </div>
              </div>
            ) : null}

            {isCustomerCustomsPage ? (
              <div className="mt-3 pr-1 pb-3">
                <input
                  ref={customsUploadInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleCustomsDocumentUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <div className="space-y-0">
                  <div className="flex items-center justify-start gap-3 pb-2">
                    <div className="inline-flex items-center bg-white p-1">
                      {[
                        { key: "import" as const, label: "Import" },
                        { key: "export" as const, label: "Export" }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setCustomsTradeType(tab.key)}
                          className={`inline-flex h-8 items-center rounded-[8px] px-4 text-[13px] font-medium transition ${
                            customsTradeType === tab.key
                              ? "bg-[#2054a3] text-white"
                              : "text-foreground hover:bg-[#F5F7FA]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 border-b-[0.5px] border-[#E7E6E9] pb-3">
                          <div className="text-[20px] font-medium uppercase text-foreground">COST INFORMATION (CHI PHÍ)</div>
                          <div />
                        </div>
                        <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                          <div className="overflow-x-auto">
                            <div className="min-w-[1328px]">
                              <div className="grid grid-cols-[0.5fr_3.6fr_0.7fr_1fr_1fr_1.1fr_0.8fr_1.1fr_1.2fr_1.4fr_56px] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                                {["#", "Loại chi phí", "Qty", "Unit", "Price (₫)", "Amount (₫)", "VAT%", "VAT (₫)", "Total (₫)", "Upload chứng từ", ""].map((label) => (
                                  <div key={label} className="px-4 py-2.5">
                                    {label}
                                  </div>
                                ))}
                              </div>
                              {visibleCustomsCostRows.map((row, index) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[0.5fr_3.6fr_0.7fr_1fr_1fr_1.1fr_0.8fr_1.1fr_1.2fr_1.4fr_56px] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[15px] text-foreground"
                                >
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#A0A7B4]">{index + 1}</div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.feeName}
                                      onChange={(event) =>
                                        setCustomsCostRowsByType((current) => ({
                                          ...current,
                                          [customsTradeType]: current[customsTradeType].map((item) =>
                                            item.id === row.id ? { ...item, feeName: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Nhập tên phí..."
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.quantity}
                                      onChange={(event) =>
                                        setCustomsCostRowsByType((current) => ({
                                          ...current,
                                          [customsTradeType]: current[customsTradeType].map((item) =>
                                            item.id === row.id ? { ...item, quantity: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="SL"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.unit}
                                      onChange={(event) =>
                                        setCustomsCostRowsByType((current) => ({
                                          ...current,
                                          [customsTradeType]: current[customsTradeType].map((item) =>
                                            item.id === row.id ? { ...item, unit: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Đơn vị"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.price}
                                      onChange={(event) =>
                                        setCustomsCostRowsByType((current) => ({
                                          ...current,
                                          [customsTradeType]: current[customsTradeType].map((item) =>
                                            item.id === row.id ? { ...item, price: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Đơn giá"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 font-medium">
                                    <input
                                      value={row.amount}
                                      onChange={(event) =>
                                        setCustomsCostRowsByType((current) => ({
                                          ...current,
                                          [customsTradeType]: current[customsTradeType].map((item) =>
                                            item.id === row.id ? { ...item, amount: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Thành tiền"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.vatRate}
                                      onChange={(event) =>
                                        setCustomsCostRowsByType((current) => ({
                                          ...current,
                                          [customsTradeType]: current[customsTradeType].map((item) =>
                                            item.id === row.id ? { ...item, vatRate: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="VAT%"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#9CA3AF]">
                                    <span>{row.vatAmount || "-"}</span>
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 font-semibold">
                                    <span>{row.total || "-"}</span>
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <button
                                      type="button"
                                      onClick={() => openCustomsUpload(`cost:${row.id}`)}
                                      className="inline-flex h-9 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3.5 text-[14px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                    >
                                      <Upload className="h-4 w-4" strokeWidth={2} />
                                      <span>{row.attachmentNames.length > 0 ? `${row.attachmentNames.length} file` : "Tải lên"}</span>
                                    </button>
                                  </div>
                                  <div className="flex min-h-[40px] items-center justify-end px-2 py-2">
                                    <button
                                      type="button"
                                      onClick={() => deleteCustomsCostRow(row.id)}
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                    >
                                      <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className="border-b border-[#E7E6E9] bg-white">
                                <button
                                  type="button"
                                  onClick={addCustomsCostRow}
                                  className="flex h-[38px] items-center px-4 text-[15px] font-medium text-[#4A90E2] transition hover:bg-[#F8FAFF]"
                                >
                                  + Thêm dòng phí
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                      <div className="space-y-3">
                        <div className="border-b-[0.5px] border-[#E7E6E9] pb-3 text-[20px] font-medium uppercase text-foreground">DOCUMENT MANAGEMENT (CHỨNG TỪ)</div>
                        <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                        <div className="overflow-x-auto">
                          <div className="min-w-[1120px]">
                            <div className="grid grid-cols-[52px_2.3fr_1.5fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                              {["#", "Tên chứng từ", "Hành động", "Trạng thái", "Cập nhật bởi", "Thời gian cập nhật"].map((label) => (
                                <div key={label} className={label === "#" ? "px-2 py-2.5 text-center" : "px-4 py-2.5"}>
                                  {label}
                                </div>
                              ))}
                            </div>
                            {visibleCustomsDocumentRows.map((row, index) => {
                              const statusKey =
                                row.documentName === "Debit note"
                                  ? activeCustomsDebitNoteStatus
                                  : row.documentName === "Đề nghị thanh toán"
                                    ? activeCustomsPaymentRequestStatus
                                    : "draft";
                              const statusMeta =
                                row.documentName === "Debit note"
                                  ? getDebitNoteDocumentStatusMeta(activeCustomsDebitNoteStatus)
                                  : customsDocumentStatusMeta[statusKey];
                              return (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[52px_2.3fr_1.5fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[15px] text-foreground"
                                >
                                  <div className="flex min-h-[40px] items-center justify-center px-2 py-2 text-[#A0A7B4]">
                                    {index + 1}
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">{row.documentName}</div>
                                  <div className="flex min-h-[40px] items-center gap-2 px-4 py-2">
                                    {row.documentName === "Debit note" ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={openCustomsDebitNote}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                                        >
                                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Tạo mới</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={openCustomsDebitNote}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                        >
                                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Xem</span>
                                        </button>
                                      </>
                                    ) : row.documentName === "Tờ khai hải quan" || row.documentName === "Đề nghị thanh toán" ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            row.documentName === "Tờ khai hải quan"
                                                ? openCustomsDeclaration()
                                                : viewCustomsDocumentFiles(row.id)
                                          }
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                                        >
                                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Tạo mới</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => viewCustomsDocumentFiles(row.id)}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                        >
                                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Xem</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openCustomsUpload(row.id)}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                                        >
                                          <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Tải lên</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => viewCustomsDocumentFiles(row.id)}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                        >
                                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Xem</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium ${statusMeta.className}`}>
                                      {statusMeta.label}
                                    </span>
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#4B5563]">
                                    {row.updatedBy || "-"}
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#4B5563]">
                                    {row.updatedAt || "-"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div ref={customsAuditSectionRef} className="rounded-[10px] border border-[#E7E6E9] bg-white">
                      <button
                        type="button"
                        onClick={() => setIsCustomsAuditLogOpen((current) => !current)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-[15px] font-semibold text-foreground">Lịch sử thay đổi</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isCustomsAuditLogOpen ? "rotate-180" : ""}`}
                          strokeWidth={1.8}
                        />
                      </button>
                      {isCustomsAuditLogOpen ? (
                        <div className="border-t border-[#E7E6E9]">
                          <div className="overflow-x-auto">
                            <div className="min-w-[980px]">
                              <div className="grid grid-cols-[1fr_1.2fr_1.6fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[12px] font-medium text-muted-foreground">
                                {["Hành động", "Trường thay đổi", "Giá trị trước → sau", "Người thực hiện", "Thời gian"].map((label) => (
                                  <div key={label} className="px-4 py-2.5">
                                    {label}
                                  </div>
                                ))}
                              </div>
                              {visibleCustomsAuditRows.map((row) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[1fr_1.2fr_1.6fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] text-foreground"
                                >
                                  <div className="flex min-h-[38px] items-center px-4">{row.action}</div>
                                  <div className="flex min-h-[38px] items-center px-4">{row.field}</div>
                                  <div className="flex min-h-[38px] items-center px-4">
                                    <span className="truncate">{row.beforeValue}</span>
                                    <span className="mx-2 text-muted-foreground">→</span>
                                    <span className="truncate">{row.afterValue}</span>
                                  </div>
                                  <div className="flex min-h-[38px] items-center px-4">{row.actor}</div>
                                  <div className="flex min-h-[38px] items-center px-4 text-[#4B5563]">{row.time}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            ) : null}

            {isCustomerInlandPage ? (
              <div className="mt-3 pr-1 pb-3">
                <input
                  ref={inlandUploadInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleInlandDocumentUpload(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={saveInlandDraft}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Lưu nháp
                    </button>
                    <div className="inline-flex items-center bg-white p-1">
                      {[
                        { key: "import" as const, label: "Import" },
                        { key: "export" as const, label: "Export" }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setInlandTradeType(tab.key)}
                          className={`inline-flex h-8 items-center rounded-[8px] px-4 text-[13px] font-medium transition ${
                            inlandTradeType === tab.key
                              ? "bg-[#2054a3] text-white"
                              : "text-foreground hover:bg-[#F5F7FA]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 border-b-[0.5px] border-[#E7E6E9] pb-3">
                          <div className="text-[20px] font-medium uppercase text-foreground">COST INFORMATION (CHI PHÍ)</div>
                          <div />
                        </div>
                        <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                          <div className="overflow-x-auto">
                            <div className="min-w-[1280px]">
                              <div className="grid grid-cols-[0.5fr_3.6fr_0.7fr_1fr_1fr_1.1fr_0.8fr_1.1fr_1.2fr_1.4fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                                {["#", "Loại chi phí", "Qty", "Unit", "Price (₫)", "Amount (₫)", "VAT%", "VAT (₫)", "Total (₫)", "Upload chứng từ"].map((label) => (
                                  <div key={label} className="px-4 py-2.5">
                                    {label}
                                  </div>
                                ))}
                              </div>
                              {visibleInlandCostRows.map((row, index) => (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[0.5fr_3.6fr_0.7fr_1fr_1fr_1.1fr_0.8fr_1.1fr_1.2fr_1.4fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[15px] text-foreground"
                                >
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#A0A7B4]">{index + 1}</div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.feeName}
                                      onChange={(event) =>
                                        setInlandCostRowsByType((current) => ({
                                          ...current,
                                          [inlandTradeType]: current[inlandTradeType].map((item) =>
                                            item.id === row.id ? { ...item, feeName: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Nhập tên phí..."
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.quantity}
                                      onChange={(event) =>
                                        setInlandCostRowsByType((current) => ({
                                          ...current,
                                          [inlandTradeType]: current[inlandTradeType].map((item) =>
                                            item.id === row.id ? { ...item, quantity: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="SL"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.unit}
                                      onChange={(event) =>
                                        setInlandCostRowsByType((current) => ({
                                          ...current,
                                          [inlandTradeType]: current[inlandTradeType].map((item) =>
                                            item.id === row.id ? { ...item, unit: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Đơn vị"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.price}
                                      onChange={(event) =>
                                        setInlandCostRowsByType((current) => ({
                                          ...current,
                                          [inlandTradeType]: current[inlandTradeType].map((item) =>
                                            item.id === row.id ? { ...item, price: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Đơn giá"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 font-medium">
                                    <input
                                      value={row.amount}
                                      onChange={(event) =>
                                        setInlandCostRowsByType((current) => ({
                                          ...current,
                                          [inlandTradeType]: current[inlandTradeType].map((item) =>
                                            item.id === row.id ? { ...item, amount: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="Thành tiền"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <input
                                      value={row.vatRate}
                                      onChange={(event) =>
                                        setInlandCostRowsByType((current) => ({
                                          ...current,
                                          [inlandTradeType]: current[inlandTradeType].map((item) =>
                                            item.id === row.id ? { ...item, vatRate: event.target.value } : item
                                          )
                                        }))
                                      }
                                      placeholder="VAT%"
                                      className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] focus:border-black"
                                    />
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#9CA3AF]">
                                    <span>{row.vatAmount || "-"}</span>
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 font-semibold">
                                    <span>{row.total || "-"}</span>
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <button
                                      type="button"
                                      onClick={() => openInlandUpload(`cost:${row.id}`)}
                                      className="inline-flex h-9 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3.5 text-[14px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                    >
                                      <Upload className="h-4 w-4" strokeWidth={2} />
                                      <span>{row.attachmentNames.length > 0 ? `${row.attachmentNames.length} file` : "Tải lên"}</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className="border-b border-[#E7E6E9] bg-white">
                                <button
                                  type="button"
                                  onClick={addInlandCostRow}
                                  className="flex h-[38px] items-center px-4 text-[15px] font-medium text-[#4A90E2] transition hover:bg-[#F8FAFF]"
                                >
                                  + Thêm dòng phí
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <button
                            type="button"
                            onClick={openInlandDebitNote}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-4 text-[14px] font-medium text-foreground transition hover:bg-[#fafafa]"
                          >
                            <FileText className="h-4 w-4" strokeWidth={2} />
                            <span>Tạo Debit Note</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div className="space-y-3">
                      <div className="border-b-[0.5px] border-[#E7E6E9] pb-3 text-[20px] font-medium uppercase text-foreground">DOCUMENT MANAGEMENT (CHỨNG TỪ)</div>
                      <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                        <div className="overflow-x-auto">
                          <div className="min-w-[1120px]">
                            <div className="grid grid-cols-[52px_2.3fr_1.7fr_1fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                              {["#", "Tên chứng từ", "Hành động", "Trạng thái", "Cập nhật bởi", "Thời gian cập nhật"].map((label) => (
                                <div key={label} className={label === "#" ? "px-2 py-2.5 text-center" : "px-4 py-2.5"}>
                                  {label}
                                </div>
                              ))}
                            </div>
                            {visibleInlandDocumentRows.map((row, index) => {
                              const inlandUploadAndViewDocuments = new Set([
                                "BL",
                                "AN",
                                "DO",
                                "EIR",
                                "Các chứng từ khác",
                                "PoB - các phiếu thu/hóa đơn chi hộ"
                              ]);
                              const inlandCreateAndViewDocuments = new Set([
                                "Biên bản giao hàng",
                                "Debit note",
                                "Đề nghị thanh toán",
                                "AN tàu nội địa"
                              ]);
                              const documentStatus =
                                row.documentName === "Debit note"
                                  ? getDebitNoteDocumentStatusMeta(activeInlandDebitNoteStatus)
                                  : row.documentName === "Đề nghị thanh toán"
                                    ? customsDocumentStatusMeta[activeInlandPaymentRequestStatus]
                                    : row.displayMode === "DISPLAY_ONLY"
                                      ? { label: "Nháp", className: "bg-[#F1F3F5] text-[#68707B]" }
                                      : row.files.length > 0
                                        ? { label: "Đã xác nhận", className: "bg-[#EAF7EE] text-[#1F7A35]" }
                                        : row.required
                                          ? { label: "Chờ xác nhận", className: "bg-[#FFF1E8] text-[#C75B12]" }
                                          : { label: "Nháp", className: "bg-[#F1F3F5] text-[#68707B]" };
                              const canCreate = inlandCreateAndViewDocuments.has(row.documentName);
                              const canUpload = !canCreate && row.displayMode !== "DISPLAY_ONLY";
                              const canView =
                                canCreate ||
                                row.files.length > 0 ||
                                row.displayMode === "DISPLAY_ONLY" ||
                                inlandUploadAndViewDocuments.has(row.documentName);
                              return (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[52px_2.3fr_1.7fr_1fr_1fr_1fr] border-b border-[#E7E6E9] text-[15px] text-foreground"
                                >
                                  <div className="flex min-h-[40px] items-center justify-center px-2 py-2 text-[#A0A7B4]">
                                    {index + 1}
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">{row.documentName}</div>
                                  <div className="flex min-h-[40px] items-center gap-2 px-4 py-2">
                                    {canCreate ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            row.documentName === "Debit note"
                                              ? openInlandDebitNotesList()
                                              : viewInlandDocumentFiles(row.id)
                                          }
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                        >
                                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Tạo mới</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={openInlandDebitNote}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                        >
                                          <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Xem</span>
                                        </button>
                                      </>
                                    ) : canUpload ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => openInlandUpload(row.id)}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                        >
                                          <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                                          <span>Tải lên</span>
                                        </button>
                                        {canView ? (
                                          <button
                                            type="button"
                                            onClick={() => downloadInlandDocument(row.id)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                          >
                                            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                                            <span>Xem</span>
                                          </button>
                                        ) : null}
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                                      >
                                        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                                        <span>Xem</span>
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium ${documentStatus.className}`}>
                                      {documentStatus.label}
                                    </span>
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#4B5563]">
                                    {row.uploadedBy || (canCreate ? "Hệ thống" : "-")}
                                  </div>
                                  <div className="flex min-h-[40px] items-center px-4 py-2 text-[#4B5563]">
                                    {row.uploadedAt || (canCreate ? "12/03/2026 14:20" : "-")}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[14px] border-[0.5px] border-[#DADCE3] bg-white px-5 py-5">
                    <div ref={inlandAuditSectionRef} className="rounded-[10px] border border-[#E7E6E9] bg-white">
                      <button
                        type="button"
                        onClick={() => setIsInlandAuditLogOpen((current) => !current)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-[15px] font-semibold text-foreground">Lịch sử thay đổi</span>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isInlandAuditLogOpen ? "rotate-180" : ""}`} strokeWidth={1.8} />
                      </button>
                      {isInlandAuditLogOpen ? (
                        <div className="border-t border-[#E7E6E9]">
                          <div className="overflow-x-auto">
                            <div className="min-w-[980px]">
                              <div className="grid grid-cols-[1fr_0.9fr_1.8fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[12px] font-medium text-muted-foreground">
                                {["Hành động", "Đối tượng", "Giá trị trước → sau", "Người thực hiện", "Thời gian"].map((label) => (
                                  <div key={label} className="px-4 py-2.5">{label}</div>
                                ))}
                              </div>
                              {visibleInlandAuditRows.map((row) => (
                                <div key={row.id} className="grid grid-cols-[1fr_0.9fr_1.8fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] text-foreground">
                                  <div className="flex min-h-[38px] items-center px-4">{row.action}</div>
                                  <div className="flex min-h-[38px] items-center px-4">{row.target}</div>
                                  <div className="flex min-h-[38px] items-center px-4">
                                    <span className="truncate">{row.beforeValue}</span>
                                    <span className="mx-2 text-muted-foreground">→</span>
                                    <span className="truncate">{row.afterValue}</span>
                                  </div>
                                  <div className="flex min-h-[38px] items-center px-4">{row.actor}</div>
                                  <div className="flex min-h-[38px] items-center px-4 text-[#4B5563]">{row.time}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isCustomerOverseaPage ? (
              <div className="mt-3 pr-1 pb-3">
                <div className="space-y-3">
                  <div className="rounded-[10px] border border-[#E7E6E9] bg-[#FAFBFC] px-4 py-2">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-foreground">
                      {overseaShipmentMeta.map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.label}:</span>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-[#E7E6E9] pb-2">
                    <div className="inline-flex items-center rounded-[10px] border border-[#E7E6E9] bg-white p-1">
                      {[
                        { key: "import" as const, label: "Import" },
                        { key: "export" as const, label: "Export" }
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setOverseaTradeType(tab.key)}
                          className={`inline-flex h-8 items-center rounded-[8px] px-4 text-[13px] font-medium transition ${
                            overseaTradeType === tab.key
                              ? "bg-[#2054a3] text-white"
                              : "text-foreground hover:bg-[#F5F7FA]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={saveOverseaDraft}
                        className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                      >
                        Lưu nháp
                      </button>
                      <button
                        type="button"
                        onClick={submitOverseaModule}
                        className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                      >
                        Gửi
                      </button>
                      <button
                        type="button"
                        onClick={refreshOverseaTradeType}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>Tải lại</span>
                      </button>
                      <button
                        type="button"
                        onClick={openOverseaAuditSection}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                      >
                        <History className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>Xem lịch sử</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[10px] border border-[#E7E6E9] bg-white px-4 py-3">
                    <div className="mb-2 text-[15px] font-semibold text-foreground">Trạng thái hoàn tất</div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-foreground">
                      <div>Tổng chi phí: <span className="font-semibold">{visibleOverseaCostRows.length} dòng</span></div>
                      <div>Đã nhập: <span className="font-semibold">{overseaEnteredCostCount}</span></div>
                      <div>Chứng từ bắt buộc: <span className="font-semibold">{overseaRequiredDocumentCount}</span></div>
                      <div>Đã hoàn thành: <span className="font-semibold">{overseaCompletedDocumentCount}</span></div>
                      <div>% hoàn tất: <span className="font-semibold">{overseaCompletionPercent}%</span></div>
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E7EAF0]">
                      <div className="h-full rounded-full bg-[#2054a3]" style={{ width: `${overseaCompletionPercent}%` }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[15px] font-semibold text-foreground">Danh sách chi phí</div>
                    <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                      <div className="overflow-x-auto">
                        <div className="min-w-[980px]">
                          <div className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[12px] font-medium text-muted-foreground">
                            {["Tên chi phí", "Số tiền", "Tiền tệ", "Trạng thái", "Cập nhật bởi", "Thời gian cập nhật"].map((label) => (
                              <div key={label} className="px-4 py-2.5">{label}</div>
                            ))}
                          </div>
                          {visibleOverseaCostRows.map((row) => {
                            const isFilled = row.amount.trim() !== "";
                            const isEditing = overseaEditingCostRowId === row.id;
                            const displayAmount = isEditing
                              ? overseaCostDrafts[row.id] ?? normalizeCostAmountForEdit(row.amount)
                              : formatCostAmountDisplay(row.amount);
                            return (
                              <div key={row.id} className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr_1fr] border-b border-[#E7E6E9] text-[15px] text-foreground">
                                <div className={`flex min-h-[38px] items-center px-4 ${row.emphasized ? "font-semibold" : ""}`}>{row.feeName}</div>
                                <div className="flex min-h-[38px] items-center px-4">
                                  <input
                                    inputMode="decimal"
                                    value={displayAmount}
                                    onFocus={() => focusOverseaCostAmount(row.id, row.amount)}
                                    onChange={(event) => updateOverseaCostDraft(row.id, event.target.value)}
                                    onBlur={() => blurOverseaCostAmount(row.id)}
                                    placeholder="-"
                                    className="h-8 w-full border-b border-transparent bg-transparent px-0 text-right text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                  />
                                </div>
                                <div className="flex min-h-[38px] items-center px-4">
                                  <select
                                    value={row.currency}
                                    onChange={(event) =>
                                      updateOverseaCostCurrency(
                                        row.id,
                                        event.target.value as (typeof COST_CURRENCY_OPTIONS)[number]
                                      )
                                    }
                                    className="h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors focus:border-black"
                                  >
                                    {COST_CURRENCY_OPTIONS.map((currency) => (
                                      <option key={currency} value={currency}>
                                        {currency}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex min-h-[38px] items-center px-4">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${isFilled ? "bg-[#EAF7EE] text-[#1F7A35]" : "bg-[#F1F3F5] text-[#68707B]"}`}>
                                    {isFilled ? "Đã nhập" : "Chưa nhập"}
                                  </span>
                                </div>
                                <div className="flex min-h-[38px] items-center px-4 text-[#4B5563]">{row.updatedBy || "-"}</div>
                                <div className="flex min-h-[38px] items-center px-4 text-[#4B5563]">{row.updatedAt || "-"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[15px] font-semibold text-foreground">Danh sách chứng từ</div>
                    <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                      <div className="overflow-x-auto">
                        <div className="min-w-[1080px]">
                          <div className="grid grid-cols-[1.4fr_0.9fr_0.6fr_1fr_1.2fr_0.9fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[12px] font-medium text-muted-foreground">
                            {["Tên chứng từ", "Loại hiển thị", "Số file", "Hành động", "Ghi chú", "Cập nhật bởi", "Thời gian cập nhật"].map((label) => (
                              <div key={label} className="px-4 py-2.5">{label}</div>
                            ))}
                          </div>
                          {visibleOverseaDocumentRows.map((row) => {
                            return (
                              <div key={row.id} className="grid grid-cols-[1.4fr_0.9fr_0.6fr_1fr_1.2fr_0.9fr_1fr] border-b border-[#E7E6E9] text-[13px] text-foreground">
                                <div className="flex min-h-[38px] items-start px-4 py-2">{row.documentName}</div>
                                <div className="flex min-h-[38px] items-start px-4 py-2">DISPLAY_ONLY</div>
                                <div className="flex min-h-[38px] items-start px-4 py-2">0</div>
                                <div className="flex min-h-[38px] items-start gap-3 px-4 py-2">
                                  <span className="text-muted-foreground">Chỉ hiển thị</span>
                                </div>
                                <div className="px-4 py-2">
                                  <div className="text-[#4B5563]">{row.note || "-"}</div>
                                </div>
                                <div className="flex min-h-[38px] items-start px-4 py-2 text-[#4B5563]">{row.updatedBy || "-"}</div>
                                <div className="flex min-h-[38px] items-start px-4 py-2 text-[#4B5563]">{row.updatedAt || "-"}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div ref={overseaAuditSectionRef} className="rounded-[10px] border border-[#E7E6E9] bg-white">
                    <button
                      type="button"
                      onClick={() => setIsOverseaAuditLogOpen((current) => !current)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-[15px] font-semibold text-foreground">Lịch sử thay đổi</span>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOverseaAuditLogOpen ? "rotate-180" : ""}`} strokeWidth={1.8} />
                    </button>
                    {isOverseaAuditLogOpen ? (
                      <div className="border-t border-[#E7E6E9]">
                        <div className="overflow-x-auto">
                          <div className="min-w-[980px]">
                            <div className="grid grid-cols-[1fr_1.2fr_1.6fr_1fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[12px] font-medium text-muted-foreground">
                              {["Hành động", "Trường thay đổi", "Giá trị trước → sau", "Người thực hiện", "Thời gian"].map((label) => (
                                <div key={label} className="px-4 py-2.5">{label}</div>
                              ))}
                            </div>
                            {visibleOverseaAuditRows.map((row) => (
                              <div key={row.id} className="grid grid-cols-[1fr_1.2fr_1.6fr_1fr_1fr] border-b border-[#E7E6E9] text-[13px] text-foreground">
                                <div className="flex min-h-[38px] items-center px-4">{row.action}</div>
                                <div className="flex min-h-[38px] items-center px-4">{row.field}</div>
                                <div className="flex min-h-[38px] items-center px-4">
                                  <span className="truncate">{row.beforeValue}</span>
                                  <span className="mx-2 text-muted-foreground">→</span>
                                  <span className="truncate">{row.afterValue}</span>
                                </div>
                                <div className="flex min-h-[38px] items-center px-4">{row.actor}</div>
                                <div className="flex min-h-[38px] items-center px-4 text-[#4B5563]">{row.time}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {isServiceDetailsPage && selectedServiceDetailScope ? (
              <div className="mt-1 pr-1 min-h-fit overflow-visible">
                <div className="space-y-2">
                  <div className="rounded-[14px] bg-card">
                    <div className="p-4">
                      <div className="rounded-[14px] border border-[#DADCE3] bg-white shadow-[0_2px_10px_rgba(17,17,17,0.04)]">
                        <div className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Star className="h-7 w-7 text-muted-foreground" strokeWidth={1.8} />
                            <div className="text-[24px] font-semibold leading-none text-foreground">
                              {selectedServiceDetailRow?.item ?? selectedServiceDetailDisplayName}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 px-5 pb-5 pt-0">
                          <div className="space-y-3">
                            <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
                              <div className="space-y-0">
                                <FormField
                                  label="Mã loại hình"
                                  value={selectedServiceDetailRow?.serviceCode ?? ""}
                                  readOnly
                                  variant="inlineUnderline"
                                />
                                <FormField
                                  label="Loại hình"
                                  value={selectedServiceDetailRow?.item ?? ""}
                                  readOnly
                                  variant="inlineUnderline"
                                  allowWrapWhenReadOnly
                                />
                              </div>

                              <div className="space-y-0">
                                <FormField
                                  label="Người tạo"
                                  value={selectedServiceDetailRows[0]?.createdBy ?? "-"}
                                  readOnly
                                  variant="inlineUnderline"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border-t-[0.5px] border-[#E7E6E9] pt-5">
                            <div className="overflow-x-auto">
                              <div className="inline-flex min-w-full border-b border-[#D9D9D9]">
                                <button
                                  type="button"
                                  className="inline-flex h-9 items-center border-b border-[#245698] bg-[#F2F4F7] px-4 text-[14px] font-medium text-foreground"
                                >
                                  Danh sách phí
                                </button>
                              </div>
                            </div>

                            <div className="mt-0">
                              <div>
                                <div className="grid grid-cols-[1.2fr_1.1fr_1fr_0.8fr] border-b border-[#E7E6E9] text-[13px] font-medium text-foreground">
                                  {["Loại phí", "Đơn vị tính", "Đơn giá", "Bắt buộc"].map((label) => (
                                    <div key={`service-fee-heading-${label}`} className="whitespace-nowrap px-4 py-3">
                                      {label}
                                    </div>
                                  ))}
                                </div>
                                {serviceDetailFeeRows.map((row, rowIndex) => (
                                  <div
                                    key={`service-fee-row-${rowIndex}`}
                                    className="grid grid-cols-[1.2fr_1.1fr_1fr_0.8fr_auto] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                  >
                                    <div className="flex items-center px-4 py-2">
                                      <input
                                        value={row.feeType}
                                        onChange={(event) =>
                                          setServiceDetailFeeRows((current) =>
                                            current.map((currentRow, currentIndex) =>
                                              currentIndex === rowIndex ? { ...currentRow, feeType: event.target.value } : currentRow
                                            )
                                          )
                                        }
                                        placeholder="Nhập loại phí"
                                        className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                      />
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                      <TableDropdownField
                                        value={row.unit}
                                        options={serviceDetailFeeUnitOptions}
                                        onChange={(value) =>
                                          setServiceDetailFeeRows((current) =>
                                            current.map((currentRow, currentIndex) =>
                                              currentIndex === rowIndex ? { ...currentRow, unit: value } : currentRow
                                            )
                                          )
                                        }
                                        placeholder="Chọn đơn vị tính"
                                        placeholderClassName="text-foreground"
                                      />
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                      <input
                                        value={row.rate}
                                        onChange={(event) =>
                                          setServiceDetailFeeRows((current) =>
                                            current.map((currentRow, currentIndex) =>
                                              currentIndex === rowIndex ? { ...currentRow, rate: event.target.value } : currentRow
                                            )
                                          )
                                        }
                                        placeholder="Nhập đơn giá"
                                        className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                      />
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                      <label className="flex h-8 w-8 cursor-pointer items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={row.required}
                                          onChange={(event) =>
                                            setServiceDetailFeeRows((current) =>
                                              current.map((currentRow, currentIndex) =>
                                                currentIndex === rowIndex ? { ...currentRow, required: event.target.checked } : currentRow
                                              )
                                            )
                                          }
                                          className="h-4 w-4 rounded border-border text-[#245698] focus:ring-[#245698]"
                                        />
                                      </label>
                                    </div>
                                    <div className="flex items-center justify-end px-2 py-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setServiceDetailFeeRows((current) =>
                                            current.filter((_, currentIndex) => currentIndex !== rowIndex)
                                          )
                                        }
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                      >
                                        <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                {isServiceDetailFeeFormOpen ? (
                                  <div
                                    ref={serviceDetailFeeInlineFormRef}
                                    className={`grid border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground ${
                                      hasServiceDetailFeeDraft
                                        ? "grid-cols-[1.2fr_1.1fr_1fr_0.8fr_auto]"
                                        : "grid-cols-[1.2fr_1.1fr_1fr_0.8fr]"
                                    }`}
                                  >
                                    <div className="flex items-center px-4 py-2">
                                      <input
                                        value={serviceDetailFeeForm.feeType}
                                        onChange={(event) =>
                                          setServiceDetailFeeForm((current) => ({ ...current, feeType: event.target.value }))
                                        }
                                        placeholder="Nhập loại phí"
                                        className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                      />
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                      <TableDropdownField
                                        value={serviceDetailFeeForm.unit}
                                        options={serviceDetailFeeUnitOptions}
                                        onChange={(value) => setServiceDetailFeeForm((current) => ({ ...current, unit: value }))}
                                        placeholder="Chọn đơn vị tính"
                                        placeholderClassName="text-foreground"
                                      />
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                      <input
                                        value={serviceDetailFeeForm.rate}
                                        onChange={(event) =>
                                          setServiceDetailFeeForm((current) => ({ ...current, rate: event.target.value }))
                                        }
                                        placeholder="Nhập đơn giá"
                                        className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                      />
                                    </div>
                                    <div className="flex items-center px-4 py-2">
                                      <label className="flex h-8 w-8 cursor-pointer items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={serviceDetailFeeForm.required}
                                          onChange={(event) =>
                                            setServiceDetailFeeForm((current) => ({ ...current, required: event.target.checked }))
                                          }
                                          className="h-4 w-4 rounded border-border text-[#245698] focus:ring-[#245698]"
                                        />
                                      </label>
                                    </div>
                                    {hasServiceDetailFeeDraft ? (
                                      <div className="flex items-center justify-end px-2 py-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setServiceDetailFeeForm(initialServiceDetailFeeForm);
                                            setIsServiceDetailFeeFormOpen(false);
                                          }}
                                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                        >
                                          <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                <button
                                  type="button"
                                  className="grid w-full grid-cols-[1.2fr_1.1fr_1fr_0.8fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-left transition hover:bg-[#F8FAFF]"
                                  onClick={openNextServiceDetailFeeRow}
                                >
                                  <div className="col-span-4 flex h-[36px] items-center gap-2 px-4 text-[14px] text-[#4A63B8]">
                                    <Plus className="h-4 w-4" strokeWidth={2.2} />
                                    Thêm một dòng
                                  </div>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-4">
                      <div className="space-y-5">
                        {serviceDetailActivityGroups.map((group) => (
                          <div key={group.label}>
                            <div className="relative flex items-center justify-center">
                              <div className="absolute inset-x-0 top-1/2 h-[0.5px] -translate-y-1/2 bg-[#E7E6E9]" />
                              <div className="relative bg-background px-3 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{group.label}</div>
                            </div>
                            <div className="mt-4 space-y-3">
                              {group.entries.map((entry) => (
                                <div key={`${group.label}-${entry.actor}-${entry.time}`} className="flex items-start gap-3">
                                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-white ${getAvatarColorClass(entry.actor)}`}>
                                    {entry.actor.trim().charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-foreground">
                                      <span>{entry.actor}</span>
                                      <span className="text-[12px] font-normal text-muted-foreground">{entry.time}</span>
                                    </div>
                                    <div className="mt-1 text-[14px] text-foreground">{entry.message}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {isCustomerImportModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomerImportModalOpen(false)}
        >
          <div
            className="w-full max-w-[760px] rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-5 py-4">
              <div className="text-[18px] font-semibold text-foreground">Import file Excel/CSV</div>
              <button
                type="button"
                aria-label="Đóng modal"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                onClick={() => setIsCustomerImportModalOpen(false)}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="border-b-[0.5px] border-border px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => customerImportInputRef.current?.click()}
                  className="inline-flex h-10 items-center rounded-full border-[0.5px] border-[#245698] bg-white px-5 text-[14px] font-medium text-[#245698] transition hover:bg-[#F5F8FF]"
                >
                  Tải tệp dữ liệu lên
                </button>
                <div className={`text-[14px] ${customerImportFileName ? "font-medium text-foreground" : "italic text-foreground"}`}>
                  {customerImportFileName || "Chưa đặt tên"}
                </div>
              </div>
            </div>

            <input
              ref={customerImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                handleCustomerImportFileChange(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <div className="px-5 py-0">
              <button
                type="button"
                className="flex min-h-[320px] w-full flex-col items-center justify-center border-b-[0.5px] border-border px-6 py-8 text-center transition hover:bg-[#FCFDFE]"
                onClick={() => customerImportInputRef.current?.click()}
              >
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF4FF] text-[#245698]">
                  <FileText className="h-9 w-9" strokeWidth={1.6} />
                </span>
                <div className="mt-5 text-[18px] font-semibold leading-tight text-foreground">
                  Thả hoặc tải lên một tệp để nhập
                </div>
                <p className="mt-3 max-w-[500px] text-[14px] leading-6 text-muted-foreground">
                  Khuyến dùng tệp Excel để định dạng tự động. Bạn cũng có thể sử dụng tệp CSV để nhập nhanh dữ liệu khách hàng.
                </p>
                <a
                  href={sampleCustomerImportTemplateHref}
                  download="customer-import-template.csv"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border-[0.5px] border-[#245698] bg-white px-4 text-[14px] font-medium text-[#245698] transition hover:bg-[#F5F8FF]"
                >
                  <Download className="h-4 w-4" strokeWidth={1.8} />
                  <span>Tải xuống file mẫu</span>
                </a>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isContractImportModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsContractImportModalOpen(false)}
        >
          <div
            className="w-full max-w-[760px] rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-5 py-4">
              <div className="text-[18px] font-semibold text-foreground">Import file Excel/CSV</div>
              <button
                type="button"
                aria-label="Đóng modal"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                onClick={() => setIsContractImportModalOpen(false)}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="border-b-[0.5px] border-border px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => contractImportInputRef.current?.click()}
                  className="inline-flex h-10 items-center rounded-full border-[0.5px] border-[#245698] bg-white px-5 text-[14px] font-medium text-[#245698] transition hover:bg-[#F5F8FF]"
                >
                  Tải tệp dữ liệu lên
                </button>
                <div className={`text-[14px] ${contractImportFileName ? "font-medium text-foreground" : "italic text-foreground"}`}>
                  {contractImportFileName || "Chưa đặt tên"}
                </div>
              </div>
            </div>

            <input
              ref={contractImportInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                handleContractImportFileChange(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <div className="px-5 py-0">
              <button
                type="button"
                className="flex min-h-[320px] w-full flex-col items-center justify-center border-b-[0.5px] border-border px-6 py-8 text-center transition hover:bg-[#FCFDFE]"
                onClick={() => contractImportInputRef.current?.click()}
              >
                <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF4FF] text-[#245698]">
                  <FileText className="h-9 w-9" strokeWidth={1.6} />
                </span>
                <div className="mt-5 text-[18px] font-semibold leading-tight text-foreground">
                  Thả hoặc tải lên một tệp để nhập
                </div>
                <p className="mt-3 max-w-[500px] text-[14px] leading-6 text-muted-foreground">
                  Khuyến dùng tệp Excel để định dạng tự động. Bạn cũng có thể sử dụng tệp CSV để nhập nhanh dữ liệu hợp đồng.
                </p>
                <a
                  href={sampleCustomerImportTemplateHref}
                  download="contract-import-template.csv"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border-[0.5px] border-[#245698] bg-white px-4 text-[14px] font-medium text-[#245698] transition hover:bg-[#F5F8FF]"
                >
                  <Download className="h-4 w-4" strokeWidth={1.8} />
                  <span>Tải xuống file mẫu</span>
                </a>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomsDebitNotesListOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomsDebitNotesListOpen(false)}
        >
          <div
            className="w-full max-w-[760px] overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-5 py-4">
              <div className="text-[18px] font-semibold text-foreground">Debit notes</div>
              <button
                type="button"
                aria-label="Đóng modal"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                onClick={() => setIsCustomsDebitNotesListOpen(false)}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                <div className="grid grid-cols-[1.7fr_1.2fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                  {["Tên debit note", "Thời gian", "Trạng thái"].map((label) => (
                    <div key={label} className="px-4 py-2.5">
                      {label}
                    </div>
                  ))}
                </div>
                {customsDebitNoteListRows.map((row) => {
                  const isApproved = row.status === "approved";
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.7fr_1.2fr_1fr] border-b border-[#E7E6E9] text-[15px] text-foreground last:border-b-0"
                    >
                      <div className="flex min-h-[52px] items-center px-4 py-2">
                        <button
                          type="button"
                          onClick={() => openCustomsDebitNoteFromList(row.status)}
                          className="text-left text-[15px] font-medium text-[#245698] transition hover:underline"
                        >
                          {row.title}
                        </button>
                      </div>
                      <div className="flex min-h-[52px] items-center px-4 py-2 text-[#4B5563]">{row.timestamp}</div>
                      <div className="flex min-h-[52px] items-center px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[13px] font-medium ${
                            isApproved
                              ? "bg-[#EEF6E7] text-[#4E8A14]"
                              : "bg-[#F5F5F4] text-[#6B7280]"
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${isApproved ? "bg-[#4E8A14]" : "bg-[#9CA3AF]"}`} />
                          {isApproved ? "Đã duyệt" : "Đã hủy"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
              <button
                type="button"
                onClick={createCustomsDebitNoteFromList}
                disabled={!canCreateCustomsDebitNote}
                className={`inline-flex h-10 w-full items-center justify-center rounded-full border-[0.5px] px-4 text-[15px] font-medium transition ${
                  canCreateCustomsDebitNote
                    ? "border-[#CBCBCB] bg-white text-foreground hover:bg-[#fafafa]"
                    : "cursor-not-allowed border-[#E5E7EB] bg-[#F7F7F8] text-[#9CA3AF]"
                }`}
              >
                + Tạo debit note mới
              </button>
              <div className="mt-3 text-center text-[14px] font-medium text-muted-foreground">
                Chỉ có thể tạo mới khi tất cả debit note đã bị hủy
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {isInlandDebitNotesListOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsInlandDebitNotesListOpen(false)}
        >
          <div
            className="w-full max-w-[760px] overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-5 py-4">
              <div className="text-[18px] font-semibold text-foreground">Debit notes</div>
              <button
                type="button"
                aria-label="Đóng modal"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                onClick={() => setIsInlandDebitNotesListOpen(false)}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                <div className="grid grid-cols-[1.7fr_1.2fr_1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                  {["Tên debit note", "Thời gian", "Trạng thái"].map((label) => (
                    <div key={label} className="px-4 py-2.5">
                      {label}
                    </div>
                  ))}
                </div>
                {inlandDebitNoteListRows.map((row) => {
                  const isApproved = row.status === "approved";
                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-[1.7fr_1.2fr_1fr] border-b border-[#E7E6E9] text-[15px] text-foreground last:border-b-0"
                    >
                      <div className="flex min-h-[52px] items-center px-4 py-2">
                        <button
                          type="button"
                          onClick={() => openInlandDebitNoteFromList(row.status)}
                          className="text-left text-[15px] font-medium text-[#245698] transition hover:underline"
                        >
                          {row.title}
                        </button>
                      </div>
                      <div className="flex min-h-[52px] items-center px-4 py-2 text-[#4B5563]">{row.timestamp}</div>
                      <div className="flex min-h-[52px] items-center px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[13px] font-medium ${
                            isApproved ? "bg-[#EEF6E7] text-[#4E8A14]" : "bg-[#F5F5F4] text-[#6B7280]"
                          }`}
                        >
                          <span className={`h-2.5 w-2.5 rounded-full ${isApproved ? "bg-[#4E8A14]" : "bg-[#9CA3AF]"}`} />
                          {isApproved ? "Đã duyệt" : "Đã hủy"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={createInlandDebitNoteFromList}
                  disabled={!canCreateInlandDebitNote}
                  className={`inline-flex h-10 w-full items-center justify-center rounded-full border-[0.5px] px-4 text-[15px] font-medium transition ${
                    canCreateInlandDebitNote
                      ? "border-[#CBCBCB] bg-white text-foreground hover:bg-[#fafafa]"
                      : "cursor-not-allowed border-[#E5E7EB] bg-[#F7F7F8] text-[#9CA3AF]"
                  }`}
                >
                  + Tạo debit note mới
                </button>
                <div className="mt-3 text-center text-[14px] font-medium text-muted-foreground">
                  Chỉ có thể tạo mới khi tất cả debit note đã bị hủy
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomsDocumentFilesModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomsDocumentFilesModalOpen(false)}
        >
          <div
            className="w-full max-w-[760px] overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-5 py-4">
              <div className="text-[18px] font-semibold text-foreground">
                {activeCustomsDocumentFilesRow?.documentName || "Danh sách chứng từ"}
              </div>
              <button
                type="button"
                aria-label="Đóng modal"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                onClick={() => setIsCustomsDocumentFilesModalOpen(false)}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                <div className="grid grid-cols-[1.8fr_1fr_1.1fr] border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground">
                  {["Tên file", "Thời gian tải lên", "Hành động"].map((label) => (
                    <div key={label} className="px-4 py-2.5">
                      {label}
                    </div>
                  ))}
                </div>
                {visibleCustomsGeneratedDocumentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-[1.8fr_1fr_1.1fr] border-b border-[#E7E6E9] text-[15px] text-foreground last:border-b-0"
                  >
                    <div className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#EEF3FF] text-[#245698]">
                        <FileText className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setToast({
                            kind: "success",
                            message: `Đang mở ${file.name}.`
                          })
                        }
                        className="truncate text-left font-medium text-[#245698] transition hover:text-[#1b467d] hover:underline"
                      >
                        {file.name}
                      </button>
                    </div>
                    <div className="flex min-h-[52px] items-center px-4 py-2 text-[#4B5563]">
                      {file.uploadedAt}
                    </div>
                    <div className="flex min-h-[52px] items-center gap-2 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => replaceCustomsDocumentFile(file.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                      >
                        <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                        <span>Thay đổi file</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Xóa ${file.name}`}
                        onClick={() => deleteCustomsGeneratedDocumentFile(file.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border-[0.5px] border-[#E5E7EB] bg-white text-[#6B7280] transition hover:border-[#F3D0D0] hover:bg-[#FFF7F7] hover:text-[#C53B3B]"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomsDeclarationOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomsDeclarationOpen(false)}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-[1240px] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="text-[18px] font-semibold text-foreground">Tờ khai hải quan</div>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất Excel tờ khai hải quan."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất XML tờ khai hải quan."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất XML</span>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                  {visibleDebitNoteFlowSteps.map((step, index) => (
                    <div
                      key={`customs-declaration-header-${step.key}`}
                      className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                        index <= activeVisibleCustomsDeclarationStepIndex
                          ? index === activeVisibleCustomsDeclarationStepIndex
                            ? "bg-[#2054a3] text-white"
                            : "bg-[#EAF1FB] text-[#245698]"
                          : "bg-[#F3F4F6] text-muted-foreground"
                      } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Đóng modal"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                  onClick={() => setIsCustomsDeclarationOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-5 pb-10">
              <div className="mb-3 flex justify-end">
                <div className="flex items-center gap-2">
                  <label className="text-[13px] font-medium text-muted-foreground">Zoom</label>
                  <select
                    value={customsDeclarationZoom}
                    onChange={(event) => setCustomsDeclarationZoom(Number(event.target.value) as 100 | 125 | 150)}
                    className="h-8 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground outline-none transition focus:border-black"
                  >
                    <option value={100}>100%</option>
                    <option value={125}>125%</option>
                    <option value={150}>150%</option>
                  </select>
                </div>
              </div>
              <div className="flex w-full justify-center pb-12">
              <div
                className="overflow-hidden rounded-[12px] border border-[#1F2937] bg-white text-[9px] leading-[1.05]"
                style={{
                  width: `${100 / customsDeclarationZoomScale}%`,
                  transform: `scale(${customsDeclarationZoomScale})`,
                  transformOrigin: "top center"
                }}
              >
                <div className="flex items-center justify-between border-b border-[#1F2937] px-4 py-2 text-[10px] text-foreground">
                  <span>{customsTradeType === "export" ? "<EXP>" : "<IMP>"}</span>
                  <span>1 / 24</span>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-center">
                  <div className="text-[13px] font-bold text-foreground">
                    {customsTradeType === "export"
                      ? "Tờ khai hàng hóa xuất khẩu (thông quan)"
                      : "Tờ khai hàng hóa nhập khẩu (thông quan)"}
                  </div>
                </div>

                <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-6 border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span>Số tờ khai</span><span className="font-semibold font-['Courier_New']">308341177010</span></div>
                    <div className="flex justify-between gap-4"><span>Số tờ khai tạm nhập tái xuất tương ứng</span><span className="font-['Courier_New']">-</span></div>
                    <div className="flex justify-between gap-4"><span>Mã phân loại kiểm tra</span><span className="font-['Courier_New']">1</span></div>
                    <div className="flex justify-between gap-4"><span>Tên cơ quan Hải quan tiếp nhận tờ khai</span><span className="font-['Courier_New']">HQHOALAC</span></div>
                    <div className="flex justify-between gap-4"><span>Ngày đăng ký</span><span className="font-['Courier_New']">19/03/2026 09:14:46</span></div>
                    <div className="flex justify-between gap-4"><span>Thời hạn tái nhập/ tái xuất</span><span className="font-['Courier_New']">/ / -</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span>Số tờ khai đầu tiên</span><span className="font-['Courier_New']">- /</span></div>
                    <div className="h-[1.05em]" />
                    <div className="flex justify-between gap-4"><span>Mã loại hình</span><span className="font-['Courier_New']">B11&nbsp;&nbsp;&nbsp;2</span></div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="text-[34px] font-light leading-none tracking-tight text-foreground font-['Courier_New']">308341177010</div>
                    <div className="flex justify-between gap-4"><span>Mã số thuế đại diện</span><span className="font-['Courier_New']">8409</span></div>
                    <div className="flex justify-between gap-4"><span>Mã bộ phận xử lý tờ khai</span><span className="font-['Courier_New']">01</span></div>
                    <div className="flex justify-between gap-4"><span>Ngày thay đổi đăng ký</span><span className="font-['Courier_New']">/ /</span></div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3">
                  <div className="mb-3 text-[10px] font-semibold text-foreground">Người xuất khẩu</div>
                  <div className="grid grid-cols-[190px_1fr] gap-y-1 pl-[30px] text-[10px] text-foreground">
                    <div>Mã</div><div className="font-['Courier_New']">0100774342</div>
                    <div>Tên</div><div className="font-['Courier_New']">Công Ty TNHH Yamaha Motor Việt Nam</div>
                    <div>Mã bưu chính</div><div className="font-['Courier_New']">(+84)43</div>
                    <div>Địa chỉ</div><div className="font-['Courier_New']">Thôn Bình An, xã Trung Giã, Thành phố Hà Nội, Việt Nam</div>
                    <div>Số điện thoại</div><div className="font-['Courier_New']">84.24.35824900</div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3">
                  <div className="mb-3 text-[10px] font-semibold text-foreground">Người ủy thác xuất khẩu</div>
                  <div className="grid grid-cols-[190px_1fr] gap-y-1 pl-[30px] text-[10px] text-foreground">
                    <div>Mã</div><div className="font-['Courier_New']">-</div>
                    <div>Tên</div><div className="font-['Courier_New']">-</div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3">
                  <div className="mb-3 text-[10px] font-semibold text-foreground">Người nhập khẩu</div>
                  <div className="grid grid-cols-[190px_1fr_1fr] gap-y-1 pl-[30px] text-[10px] text-foreground">
                    <div>Mã</div><div className="col-span-2 font-['Courier_New']">-</div>
                    <div>Tên</div><div className="col-span-2 font-['Courier_New']">PT. YAMAHA INDONESIA MOTOR MFG</div>
                    <div>Mã bưu chính</div><div className="font-['Courier_New']">+62</div><div />
                    <div>Địa chỉ</div><div className="font-['Courier_New']">JL. DR KRT RADJIMAN WIDYODININGRAT JAKARTA TIMUR 13920</div><div className="font-['Courier_New']">RT/RW 009-06 RAWA TERATE CAKUNG INDONESIA</div>
                    <div>Mã nước</div><div className="font-['Courier_New']">ID</div><div />
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-1.5 text-[10px] text-foreground">
                  <div className="grid grid-cols-[1fr_260px]">
                    <div className="font-semibold">Đại lý Hải quan</div>
                    <div className="font-semibold text-right">Mã nhân viên Hải quan</div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="space-y-1">
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Số vận đơn</div>
                      <div className="font-['Courier_New']">122600038550241</div>
                      <div />
                    </div>
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Số lượng</div>
                      <div className="font-['Courier_New'] text-right">13</div>
                      <div className="font-['Courier_New']">PK</div>
                    </div>
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Tổng trọng lượng hàng (Gross)</div>
                      <div className="font-['Courier_New'] text-right">10.278</div>
                      <div className="font-['Courier_New']">KGM</div>
                    </div>
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Địa điểm lưu kho</div>
                      <div className="font-['Courier_New']">01PLC10</div>
                      <div className="font-['Courier_New']">YAMAHA MOTOR VN</div>
                    </div>
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Địa điểm nhận hàng cuối cùng</div>
                      <div className="font-['Courier_New']">IDCGK</div>
                      <div className="font-['Courier_New']">JAKARTA</div>
                    </div>
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Địa điểm xếp hàng</div>
                      <div className="font-['Courier_New']">VNCXP</div>
                      <div className="font-['Courier_New']">CANG XANH VIP</div>
                    </div>
                    <div className="grid grid-cols-[260px_160px_1fr] gap-4">
                      <div>Phương tiện vận chuyển dự kiến</div>
                      <div className="font-['Courier_New']">9999</div>
                      <div className="font-['Courier_New']">PHOENIX D / 613S</div>
                    </div>
                    <div className="grid grid-cols-[260px_1fr] gap-4">
                      <div>Ngày hàng đi dự kiến</div>
                      <div className="font-['Courier_New']">27/03/2026</div>
                    </div>
                    <div className="grid grid-cols-[260px_1fr] gap-4">
                      <div>Ký hiệu và số hiệu</div>
                      <div className="font-['Courier_New']"> </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="grid grid-cols-[1fr_1fr] gap-x-8">
                    <div className="space-y-1">
                      <div className="font-semibold">Giấy phép xuất khẩu</div>
                      <div className="font-['Courier_New']">1</div>
                      <div className="font-['Courier_New']">2</div>
                      <div className="font-['Courier_New']">3</div>
                      <div className="font-['Courier_New']">4</div>
                      <div className="font-['Courier_New']">5</div>
                    </div>

                    <div className="border-l border-[#1F2937] pl-4 space-y-1">
                      <div className="grid grid-cols-[220px_100px_120px_1fr] gap-4">
                        <div>Số hóa đơn</div>
                        <div className="font-['Courier_New']">A</div>
                        <div className="font-['Courier_New']">-</div>
                        <div className="font-['Courier_New']">0001814</div>
                      </div>
                      <div className="grid grid-cols-[220px_1fr] gap-4">
                        <div>Số tiếp nhận hóa đơn điện tử</div>
                        <div className="font-['Courier_New']">-</div>
                      </div>
                      <div className="grid grid-cols-[220px_1fr] gap-4">
                        <div>Ngày phát hành</div>
                        <div className="font-['Courier_New']">18/03/2026</div>
                      </div>
                      <div className="grid grid-cols-[220px_1fr] gap-4">
                        <div>Phương thức thanh toán</div>
                        <div className="font-['Courier_New']">KC</div>
                      </div>
                      <div className="grid grid-cols-[220px_220px_1fr] gap-4">
                        <div>Tổng trị giá hóa đơn</div>
                        <div className="font-['Courier_New']">FOB - USD -</div>
                        <div className="font-['Courier_New']">191.542,85 - A</div>
                      </div>
                      <div className="grid grid-cols-[220px_220px_1fr] gap-4">
                        <div>Tổng trị giá tính thuế</div>
                        <div className="font-['Courier_New']">USD -</div>
                        <div className="font-['Courier_New']">191.542,85</div>
                      </div>
                      <div className="grid grid-cols-[220px_220px_1fr] gap-4">
                        <div>Tỷ giá tính thuế</div>
                        <div className="font-['Courier_New']">USD -</div>
                        <div className="font-['Courier_New']">- 26.074</div>
                      </div>
                      <div className="grid grid-cols-[220px_1fr] gap-4">
                        <div className="font-semibold">Tổng hệ số phân bổ trị giá</div>
                        <div className="font-['Courier_New']">191.542,85 -</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-2 text-[10px] text-foreground">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4">
                    <div className="space-y-1">
                      <div>Phân loại không cần quy đổi VND</div>
                      <div>Tổng số tiền thuế xuất khẩu</div>
                      <div>Số tiền bảo lãnh</div>
                    </div>
                    <div className="pt-0.5 font-semibold">Người nộp thuế</div>
                    <div className="space-y-1">
                      <div className="font-semibold">Mã xác định thời hạn nộp thuế</div>
                      <div>Tổng số tiền lệ phí</div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div><span className="font-semibold">Phân loại nộp thuế</span> <span className="font-['Courier_New']">A</span></div>
                      <div className="font-['Courier_New']">VND</div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-1.5 text-[10px] text-foreground">
                  <div className="grid grid-cols-[1fr_1fr]">
                    <div className="flex justify-end gap-3">
                      <span className="font-semibold">Tổng số trang của tờ khai</span>
                      <span className="font-['Courier_New']">24</span>
                    </div>
                    <div className="flex justify-end gap-3">
                      <span className="font-semibold">Tổng số dòng hàng của tờ khai</span>
                      <span className="font-['Courier_New']">43</span>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-2 text-[10px] text-foreground">
                  <div className="grid grid-cols-[260px_repeat(3,1fr)] gap-4">
                    <div>Số đính kèm khai báo điện tử</div>
                    <div className="font-['Courier_New']">1 -</div>
                    <div className="font-['Courier_New']">2 -</div>
                    <div className="font-['Courier_New']">3 -</div>
                  </div>
                  <div className="mt-1 grid grid-cols-[260px_1fr] gap-4">
                    <div>Phần ghi chú</div>
                    <div className="font-['Courier_New']">PTTT TT.HANG DI TU KHO CTY YAMAHA(01PLC10) VE HP TRONG 5H. TD V/C HN-HP DAI 140KM.</div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-2 text-[10px] text-foreground">
                  <div className="grid grid-cols-[1fr_1fr]">
                    <div className="flex justify-between gap-4">
                      <span>Số quản lý của nội bộ doanh nghiệp</span>
                      <span className="font-['Courier_New']"></span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Số quản lý người sử dụng</span>
                      <span className="font-['Courier_New']">00465</span>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="mb-2 font-semibold">Mục thông báo của Hải quan</div>
                  <div className="grid grid-cols-[280px_1fr] gap-4 pl-[30px]">
                    <div className="space-y-1">
                      <div>Tên trưởng đơn vị Hải quan</div>
                      <div>Ngày hoàn thành kiểm tra</div>
                      <div>Ngày cấp phép xuất nhập</div>
                      <div>Thời hạn cho phép vận chuyển bảo thuế (khởi hành)</div>
                    </div>
                    <div className="space-y-1 font-['Courier_New']">
                      <div>Trưởng Hải quan Hòa Lạc</div>
                      <div>19/03/2026 09:14:46</div>
                      <div>19/03/2026 09:14:46</div>
                      <div>19/03/2026</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[280px_1fr_220px_220px_120px] gap-4 pl-[30px]">
                    <div />
                    <div />
                    <div className="font-semibold">Địa điểm</div>
                    <div className="font-semibold">Ngày đến</div>
                    <div className="font-semibold">Ngày khởi hành</div>
                  </div>
                  <div className="mt-1 grid grid-cols-[280px_1fr_220px_220px_120px] gap-4 pl-[30px]">
                    <div>Thông tin trung chuyển</div>
                    <div className="space-y-1 font-['Courier_New']">
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                    </div>
                    <div className="space-y-1 font-['Courier_New']">
                      <div>03TGC15</div>
                      <div>/ /</div>
                      <div>/ /</div>
                    </div>
                    <div className="space-y-1 font-['Courier_New']">
                      <div>19/03/2026</div>
                      <div>/ /</div>
                      <div>/ /</div>
                    </div>
                    <div className="space-y-1 font-['Courier_New']">
                      <div>~ 19/03/2026</div>
                      <div>~ / /</div>
                      <div>~ / /</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-[280px_220px_220px_1fr] gap-4 pl-[30px]">
                    <div>Địa điểm đích cho vận chuyển bảo thuế</div>
                    <div className="font-['Courier_New']">03TGS10</div>
                    <div className="font-['Courier_New']">27/03/2026</div>
                    <div />
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3">
                  <div className="flex items-center justify-between text-[10px] text-foreground">
                    <span>{customsTradeType === "export" ? "<EXP>" : "<IMP>"}</span>
                    <span>2 / 24</span>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-center">
                  <div className="text-[13px] font-bold text-foreground">
                    {customsTradeType === "export"
                      ? "Tờ khai hàng hóa xuất khẩu (thông quan)"
                      : "Tờ khai hàng hóa nhập khẩu (thông quan)"}
                  </div>
                </div>

                <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-6 border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span>Số tờ khai</span><span className="font-semibold font-['Courier_New']">308341177010</span></div>
                    <div className="flex justify-between gap-4"><span>Số tờ khai tạm nhập tái xuất tương ứng</span><span className="font-['Courier_New']">-</span></div>
                    <div className="flex justify-between gap-4"><span>Mã phân loại kiểm tra</span><span className="font-['Courier_New']">1</span></div>
                    <div className="flex justify-between gap-4"><span>Tên cơ quan Hải quan tiếp nhận tờ khai</span><span className="font-['Courier_New']">HQHOALAC</span></div>
                    <div className="flex justify-between gap-4"><span>Ngày đăng ký</span><span className="font-['Courier_New']">19/03/2026 09:14:46</span></div>
                    <div className="flex justify-between gap-4"><span>Thời hạn tái nhập/ tái xuất</span><span className="font-['Courier_New']">/ / -</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span>Số tờ khai đầu tiên</span><span className="font-['Courier_New']">- /</span></div>
                    <div className="h-[1.05em]" />
                    <div className="flex justify-between gap-4"><span>Mã loại hình</span><span className="font-['Courier_New']">B11&nbsp;&nbsp;&nbsp;2</span></div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="flex justify-between gap-4"><span>Mã số thuế đại diện</span><span className="font-['Courier_New']">8409</span></div>
                    <div className="flex justify-between gap-4"><span>Mã bộ phận xử lý tờ khai</span><span className="font-['Courier_New']">01</span></div>
                    <div className="flex justify-between gap-4"><span>Ngày thay đổi đăng ký</span><span className="font-['Courier_New']">/ /</span></div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="mb-2 font-medium">Vanning</div>
                  <div className="space-y-1">
                    <div>Địa điểm xếp hàng lên xe chở hàng</div>
                    <div className="grid grid-cols-[140px_1fr] gap-y-1">
                      <div>Mã</div>
                      <div className="flex flex-wrap gap-x-12 font-['Courier_New']">
                        <span>1&nbsp;&nbsp;01PLC10</span>
                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                      </div>
                      <div>Tên</div>
                      <div className="font-['Courier_New']">CONG TY TNHH YAMAHA MOTOR VIET NAM</div>
                      <div>Địa chỉ</div>
                      <div className="font-['Courier_New']">Thôn Bình An, xã Trung Giã, Thành phố Hà Nội, Việt Nam</div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="mb-2 font-medium">Số container</div>
                  <div className="grid grid-cols-5 gap-x-12 gap-y-1">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-3 font-['Courier_New']">
                        <span>1</span>
                        <span>MRSU3447200</span>
                      </div>
                      <div className="font-['Courier_New']">6</div>
                      <div className="font-['Courier_New']">11</div>
                      <div className="font-['Courier_New']">16</div>
                      <div className="font-['Courier_New']">21</div>
                      <div className="font-['Courier_New']">26</div>
                      <div className="font-['Courier_New']">31</div>
                      <div className="font-['Courier_New']">36</div>
                      <div className="font-['Courier_New']">41</div>
                      <div className="font-['Courier_New']">46</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-['Courier_New']">2</div>
                      <div className="font-['Courier_New']">7</div>
                      <div className="font-['Courier_New']">12</div>
                      <div className="font-['Courier_New']">17</div>
                      <div className="font-['Courier_New']">22</div>
                      <div className="font-['Courier_New']">27</div>
                      <div className="font-['Courier_New']">32</div>
                      <div className="font-['Courier_New']">37</div>
                      <div className="font-['Courier_New']">42</div>
                      <div className="font-['Courier_New']">47</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-['Courier_New']">3</div>
                      <div className="font-['Courier_New']">8</div>
                      <div className="font-['Courier_New']">13</div>
                      <div className="font-['Courier_New']">18</div>
                      <div className="font-['Courier_New']">23</div>
                      <div className="font-['Courier_New']">28</div>
                      <div className="font-['Courier_New']">33</div>
                      <div className="font-['Courier_New']">38</div>
                      <div className="font-['Courier_New']">43</div>
                      <div className="font-['Courier_New']">48</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-['Courier_New']">4</div>
                      <div className="font-['Courier_New']">9</div>
                      <div className="font-['Courier_New']">14</div>
                      <div className="font-['Courier_New']">19</div>
                      <div className="font-['Courier_New']">24</div>
                      <div className="font-['Courier_New']">29</div>
                      <div className="font-['Courier_New']">34</div>
                      <div className="font-['Courier_New']">39</div>
                      <div className="font-['Courier_New']">44</div>
                      <div className="font-['Courier_New']">49</div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-['Courier_New']">5</div>
                      <div className="font-['Courier_New']">10</div>
                      <div className="font-['Courier_New']">15</div>
                      <div className="font-['Courier_New']">20</div>
                      <div className="font-['Courier_New']">25</div>
                      <div className="font-['Courier_New']">30</div>
                      <div className="font-['Courier_New']">35</div>
                      <div className="font-['Courier_New']">40</div>
                      <div className="font-['Courier_New']">45</div>
                      <div className="font-['Courier_New']">50</div>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 text-[10px] text-foreground">
                  <div className="mb-2 font-medium">Chỉ thị của Hải quan</div>
                  <div className="grid grid-cols-[72px_180px_1fr] gap-y-1">
                    <div />
                    <div className="font-medium">Ngày</div>
                    <div className="grid grid-cols-[1fr_1fr]">
                      <div className="font-medium">Tên</div>
                      <div className="font-medium">Nội dung</div>
                    </div>
                    {Array.from({ length: 10 }).map((_, index) => (
                      <Fragment key={`customs-directive-${index + 1}`}>
                        <div className="font-['Courier_New']">{index + 1}</div>
                        <div className="font-['Courier_New']">/ /</div>
                        <div className="grid grid-cols-[1fr_1fr]">
                          <div />
                          <div />
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1F2937] px-4 py-3">
                  <div className="flex items-center justify-between text-[10px] text-foreground">
                    <span>{customsTradeType === "export" ? "<EXP>" : "<IMP>"}</span>
                    <span>3 / 24</span>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-4 py-3 text-center">
                  <div className="text-[13px] font-bold text-foreground">
                    {customsTradeType === "export"
                      ? "Tờ khai hàng hóa xuất khẩu (thông quan)"
                      : "Tờ khai hàng hóa nhập khẩu (thông quan)"}
                  </div>
                </div>

                <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-6 border-b border-[#1F2937] px-4 py-3 text-[10px] text-foreground">
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span>Số tờ khai</span><span className="font-semibold font-['Courier_New']">308341177010</span></div>
                    <div className="flex justify-between gap-4"><span>Số tờ khai tạm nhập tái xuất tương ứng</span><span className="font-['Courier_New']">-</span></div>
                    <div className="flex justify-between gap-4"><span>Mã phân loại kiểm tra</span><span className="font-['Courier_New']">1</span></div>
                    <div className="flex justify-between gap-4"><span>Tên cơ quan Hải quan tiếp nhận tờ khai</span><span className="font-['Courier_New']">HQHOALAC</span></div>
                    <div className="flex justify-between gap-4"><span>Ngày đăng ký</span><span className="font-['Courier_New']">19/03/2026 09:14:46</span></div>
                    <div className="flex justify-between gap-4"><span>Thời hạn tái nhập/ tái xuất</span><span className="font-['Courier_New']">/ / -</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between gap-4"><span>Số tờ khai đầu tiên</span><span className="font-['Courier_New']">- /</span></div>
                    <div className="h-[1.05em]" />
                    <div className="flex justify-between gap-4"><span>Mã loại hình</span><span className="font-['Courier_New']">B11&nbsp;&nbsp;&nbsp;2</span></div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="flex justify-between gap-4"><span>Mã số thuế đại diện</span><span className="font-['Courier_New']">8409</span></div>
                    <div className="flex justify-between gap-4"><span>Mã bộ phận xử lý tờ khai</span><span className="font-['Courier_New']">01</span></div>
                    <div className="flex justify-between gap-4"><span>Ngày thay đổi đăng ký</span><span className="font-['Courier_New']">/ /</span></div>
                  </div>
                </div>

                <div className="px-4 py-3 text-[10px] text-foreground">
                  <div className="space-y-5">
                    {customsDeclarationGoodsItems.map((item) => (
                      <div key={item.id} className="border-b border-[#1F2937] pb-5 last:border-b-0">
                        <div className="mb-3 font-semibold">&lt;{item.id}&gt;</div>
                        <div className="grid grid-cols-[1.05fr_1fr] gap-x-12 gap-y-3">
                          <div className="space-y-1">
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="font-medium">Mã số hàng hóa</div>
                              <div className="font-['Courier_New']">{item.goodsCode || "-"}</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="font-medium">Mô tả hàng hóa</div>
                              <div className="font-['Courier_New']">{item.description || "-"}</div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="grid grid-cols-[180px_1fr] gap-4">
                              <div className="font-medium">Mã quản lý riêng</div>
                              <div className="font-['Courier_New']">{item.managementCode || "-"}</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="font-medium">Trị giá hóa đơn</div>
                              <div className="font-['Courier_New']">{item.invoiceValue || "-"}</div>
                            </div>
                            <div className="mt-2 font-medium">Thuế xuất khẩu</div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="pl-6">Trị giá tính thuế (S)</div>
                              <div className="font-['Courier_New']">{item.taxableValue || "-"}</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="pl-6">Số lượng tính thuế</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="pl-6">Thuế suất</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="pl-6">Số tiền thuế</div>
                              <div className="font-['Courier_New']">VND</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="pl-6">Số tiền miễn giảm</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="whitespace-nowrap font-medium">Số thứ tự của dòng hàng trên tờ khai tạm nhập tái xuất tương ứng</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="font-medium">Danh mục miễn thuế xuất khẩu</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                            <div className="grid grid-cols-[120px_1fr] gap-4">
                              <div className="font-medium">Tiền lệ phí</div>
                              <div className="space-y-1">
                                <div className="grid grid-cols-[120px_1fr] gap-4"><div>Đơn giá</div><div className="font-['Courier_New']">-</div></div>
                                <div className="grid grid-cols-[120px_1fr] gap-4"><div>Số lượng</div><div className="font-['Courier_New']">-</div></div>
                                <div className="grid grid-cols-[120px_1fr] gap-4"><div>Khoản tiền</div><div className="font-['Courier_New']">VND</div></div>
                              </div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="font-medium">Mã văn bản pháp luật khác</div>
                              <div className="font-['Courier_New']">1&nbsp;&nbsp;&nbsp;&nbsp;2&nbsp;&nbsp;&nbsp;&nbsp;3&nbsp;&nbsp;&nbsp;&nbsp;4&nbsp;&nbsp;&nbsp;&nbsp;5</div>
                            </div>
                            <div className="grid grid-cols-[240px_1fr] gap-4">
                              <div className="font-medium">Miễn / Giảm / Không chịu thuế xuất khẩu</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="grid grid-cols-[180px_1fr] gap-4">
                              <div className="font-medium">Số lượng (1)</div>
                              <div className="font-['Courier_New']">{item.quantity1 || "-"}</div>
                            </div>
                            <div className="grid grid-cols-[180px_1fr] gap-4">
                              <div className="font-medium">Số lượng (2)</div>
                              <div className="font-['Courier_New']">{item.quantity2 || "-"}</div>
                            </div>
                            <div className="grid grid-cols-[180px_1fr] gap-4">
                              <div className="font-medium">Đơn giá hóa đơn</div>
                              <div className="font-['Courier_New']">{item.invoiceUnitPrice || "-"}</div>
                            </div>
                            <div className="grid grid-cols-[180px_1fr] gap-4">
                              <div className="font-medium">Trị giá tính thuế (M)</div>
                              <div className="font-['Courier_New']">-</div>
                            </div>
                            <div className="grid grid-cols-[180px_1fr] gap-4">
                              <div className="font-medium">Đơn giá tính thuế</div>
                              <div className="font-['Courier_New']">{item.taxableUnitPrice || "-"}</div>
                            </div>
                            <div className="pt-6">
                              <div className="grid grid-cols-[120px_1fr] gap-4">
                                <div className="font-medium">Tiền bảo hiểm</div>
                                <div className="space-y-1">
                                  <div className="grid grid-cols-[120px_1fr] gap-4"><div>Đơn giá</div><div className="font-['Courier_New']">-</div></div>
                                  <div className="grid grid-cols-[120px_1fr] gap-4"><div>Số lượng</div><div className="font-['Courier_New']">-</div></div>
                                  <div className="grid grid-cols-[120px_1fr] gap-4"><div>Khoản tiền</div><div className="font-['Courier_New']">VND</div></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                  </div>
                </div>
              </div>
              </div>
            </div>
            <div className="border-t-[0.5px] border-border px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={addCustomsDeclarationGoodsItem}
                  className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  + Thêm Mã quản lý riêng
                </button>
                <div className="flex flex-wrap justify-end gap-2">
                  {activeCustomsDeclarationStatus === "draft" ? (
                    <button
                      type="button"
                      onClick={sendCustomsDeclarationForConfirmation}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Gửi xác nhận
                    </button>
                  ) : null}
                  {activeCustomsDeclarationStatus === "pending_confirmation" ? (
                    <>
                      <button
                        type="button"
                        onClick={moveCustomsDeclarationBackToDraft}
                        className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                      >
                        Đưa về nháp
                      </button>
                      <button
                        type="button"
                        onClick={confirmCustomsDeclaration}
                        className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                      >
                        Xác nhận
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isInlandDebitNoteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsInlandDebitNoteOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="text-[18px] font-semibold text-foreground">Debit Note</div>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất PDF Debit Note."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất PDF</span>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                  {visibleDebitNoteFlowSteps.map((step, index) => (
                    <div
                      key={`inland-header-${step.key}`}
                      className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                        index <= activeVisibleInlandDebitNoteStepIndex
                          ? index === activeVisibleInlandDebitNoteStepIndex
                            ? "bg-[#2054a3] text-white"
                            : "bg-[#EAF1FB] text-[#245698]"
                          : "bg-[#F3F4F6] text-muted-foreground"
                      } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Đóng modal"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                  onClick={() => setIsInlandDebitNoteOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="overflow-hidden rounded-[10px] border border-[#1F2937] bg-white">
                <div className="border-b border-[#1F2937] px-5 py-3">
                  <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                    <div className="flex items-center justify-center">
                      <Image
                        src="/pi-doc-logo.png"
                        alt="PI Logistics"
                        width={140}
                        height={84}
                        className="h-auto w-[140px] object-contain"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="text-[16px] font-bold uppercase text-foreground">PI Logistics Corporation</div>
                      <div className="text-[13px] text-foreground">5th Floor, HKC Building, 285 Doi Can Str, Ba Dinh Dist, Hanoi, Vietnam</div>
                      <div className="flex items-center justify-center gap-6 text-[13px] text-foreground">
                        <span>Tel: +84-24-62662669</span>
                        <span>Fax: +84-24-62662660</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-5 py-4 text-center">
                  <div className="text-[20px] font-bold uppercase text-foreground">Debit Note</div>
                </div>

                <div className="grid grid-cols-[160px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-1.5 font-semibold">Khách hàng:</div>
                  <div className="px-4 py-1.5 font-semibold">{shipmentDetailCustomerName}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-1.5 font-semibold">Shipment ID:</div>
                  <div className="px-4 py-1.5 font-semibold">{shipmentDetailNumber}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-1.5 font-semibold">Ngày vận chuyển:</div>
                  <div className="px-4 py-1.5 font-semibold">
                    {shipmentDetailShipmentDate
                      ? new Date(shipmentDetailShipmentDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      : "-"}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[14px] text-foreground">
                    <thead>
                      <tr className="border-b border-[#1F2937]">
                        {["Loại chi phí", "Quantity", "Unit", "Price", "Amount", "VAT", "Total"].map((label, index) => (
                          <th
                            key={`inland-preview-${label}`}
                            className={`px-3 py-2 text-center font-bold ${index < 6 ? "border-r border-[#1F2937]" : ""}`}
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                    {visibleInlandDebitNoteRows.map((row) => (
                        <tr key={`inland-preview-${row.id}`} className="border-b border-[#1F2937]">
                          <td className="border-r border-[#1F2937] px-3 py-1.5 align-top">
                            <input
                              value={row.feeName}
                              onChange={(event) => updateInlandDebitNoteRow(row.id, "feeName", event.target.value)}
                              readOnly={activeInlandDebitNoteStatus !== "draft"}
                              placeholder="Nhập tên phí..."
                              className="w-full bg-transparent text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 text-center align-top">
                            <input
                              value={row.quantity}
                              onChange={(event) => updateInlandDebitNoteRow(row.id, "quantity", event.target.value)}
                              readOnly={activeInlandDebitNoteStatus !== "draft"}
                              placeholder="SL"
                              className="w-full bg-transparent text-center text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 align-top">
                            <input
                              value={row.unit}
                              onChange={(event) => updateInlandDebitNoteRow(row.id, "unit", event.target.value)}
                              readOnly={activeInlandDebitNoteStatus !== "draft"}
                              placeholder="Đơn vị"
                              className="w-full bg-transparent text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 text-right align-top">
                            <input
                              value={row.price}
                              onChange={(event) => updateInlandDebitNoteRow(row.id, "price", event.target.value)}
                              readOnly={activeInlandDebitNoteStatus !== "draft"}
                              placeholder="Đơn giá"
                              className="w-full bg-transparent text-right text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 text-right align-top">{row.amount ? `${row.amount} đ` : "-"}</td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 text-right align-top">{row.vatAmount ? `${row.vatAmount} đ` : "-"}</td>
                          <td className="px-3 py-1.5 text-right align-top font-semibold">{row.total ? `${row.total} đ` : "-"}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={6} className="border-r border-[#1F2937] px-3 py-3 text-center text-[18px] font-bold uppercase">
                          Total of Debit Note
                        </td>
                        <td className="px-3 py-3 text-right text-[18px] font-bold">
                          {inlandDebitNoteGrandTotal ? `${inlandDebitNoteGrandTotal} đ` : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 text-[15px] text-foreground">
                  {["Kế toán trưởng", "Trưởng bộ phận", "Người đề nghị"].map((label, index) => (
                    <div key={`inland-${label}`} className={`${index < 2 ? "border-r border-[#1F2937]" : ""}`}>
                      <div className="border-b border-[#1F2937] px-3 py-2 text-center">{label}</div>
                      <div className="h-[72px] px-3 py-2" />
                      <div className="px-3 py-2 text-right">{index === 2 ? currentUserName : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">Hạn thanh toán:</span>
                  <div className="w-[152px] rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3">
                    <InlineCompactDateField
                      value={activeInlandDebitNoteDueDate}
                      onChange={(value) =>
                        setInlandDebitNoteDueDateByType((current) => ({
                          ...current,
                          [inlandTradeType]: value
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      textSizeClass="text-[13px] font-medium"
                      heightClass="h-8"
                      readOnly={activeInlandDebitNoteStatus !== "draft"}
                    />
                  </div>
                </div>
                {activeInlandDebitNoteStatus === "draft" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setToast({
                          kind: "success",
                          message: "Đã lưu nháp Debit Note."
                        })
                      }
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={sendInlandDebitNoteForConfirmation}
                      disabled={!activeInlandDebitNoteDueDate.trim()}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition ${
                        activeInlandDebitNoteDueDate.trim()
                          ? "bg-[#2054a3] text-white hover:bg-[#1b467d]"
                          : "cursor-not-allowed bg-[#D7DCE8] text-white"
                      }`}
                    >
                      Gửi xác nhận
                    </button>
                  </>
                ) : null}
                {activeInlandDebitNoteStatus === "pending_confirmation" ? (
                  <>
                    <button
                      type="button"
                      onClick={moveInlandDebitNoteBackToDraft}
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Đưa về nháp
                    </button>
                    <button
                      type="button"
                      onClick={confirmInlandDebitNote}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomsDebitNoteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomsDebitNoteOpen(false)}
        >
          <div
            className="w-full max-w-[1240px] rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="text-[18px] font-semibold text-foreground">Debit Note</div>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất PDF Debit Note."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất PDF</span>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                  {visibleDebitNoteFlowSteps.map((step, index) => (
                    <div
                      key={`customs-header-${step.key}`}
                      className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                        index <= activeVisibleCustomsDebitNoteStepIndex
                          ? index === activeVisibleCustomsDebitNoteStepIndex
                            ? "bg-[#2054a3] text-white"
                            : "bg-[#EAF1FB] text-[#245698]"
                          : "bg-[#F3F4F6] text-muted-foreground"
                      } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Đóng modal"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                  onClick={() => setIsCustomsDebitNoteOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="px-5 py-5">
              <div className="mb-4 grid gap-x-8 gap-y-3 rounded-[10px] border border-[#E7E6E9] bg-[#FCFCFD] px-4 py-3 lg:grid-cols-2">
                <div className="flex items-center gap-3 text-[14px] text-foreground">
                  <span className="min-w-[110px] text-muted-foreground">Customer</span>
                  <span>{shipmentDetailCustomerName}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-foreground">
                  <span className="min-w-[110px] text-muted-foreground">Shipment ID</span>
                  <span>{shipmentDetailNumber}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-foreground">
                  <span className="min-w-[110px] text-muted-foreground">Module</span>
                  <span>{customsTradeType === "export" ? "Export" : "Import"}</span>
                </div>
                <div className="flex items-center gap-3 text-[14px] text-foreground">
                  <span className="min-w-[110px] text-muted-foreground">Shipment Date</span>
                  <span>
                    {shipmentDetailShipmentDate
                      ? new Date(shipmentDetailShipmentDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      : "-"}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden rounded-[10px] border border-[#E7E6E9] bg-white">
                <div className="overflow-x-auto">
                  <div className="min-w-[1160px]">
                    <div
                      className={`grid ${
                        activeCustomsDebitNoteStatus === "draft"
                          ? "grid-cols-[4.85fr_0.45fr_0.55fr_0.55fr_1.2fr_0.9fr_1.2fr_1.2fr_auto]"
                          : "grid-cols-[4.85fr_0.45fr_0.55fr_0.55fr_1.2fr_0.9fr_1.2fr_1.2fr]"
                      } border-b border-[#E7E6E9] bg-[#F8F9FB] text-[15px] font-medium uppercase text-muted-foreground`}
                    >
                      {[
                        "Loại chi phí",
                        "Quantity",
                        "Unit",
                        "Price (đ)",
                        "Amount (đ)",
                        "VAT%",
                        "VAT value (đ)",
                        "Total (đ)",
                        ...(activeCustomsDebitNoteStatus === "draft" ? [""] : [])
                      ].map((label) => (
                        <div key={label} className="px-4 py-2.5">
                          {label}
                        </div>
                      ))}
                    </div>
                    {visibleCustomsDebitNoteRows.map((row) => (
                      <div
                        key={`debit-note-${row.id}`}
                        className={`grid ${
                          activeCustomsDebitNoteStatus === "draft"
                            ? "grid-cols-[4.85fr_0.45fr_0.55fr_0.55fr_1.2fr_0.9fr_1.2fr_1.2fr_auto]"
                            : "grid-cols-[4.85fr_0.45fr_0.55fr_0.55fr_1.2fr_0.9fr_1.2fr_1.2fr]"
                        } border-b border-[#E7E6E9] bg-[#FCFCFD] text-[15px] text-foreground`}
                      >
                        <div className="flex min-h-[40px] items-center px-4 py-2">
                          <input
                            value={row.feeName}
                            onChange={(event) => updateCustomsDebitNoteRow(row.id, "feeName", event.target.value)}
                            readOnly={activeCustomsDebitNoteStatus !== "draft"}
                            placeholder="Nhập tên phí..."
                            className={`h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] ${
                              activeCustomsDebitNoteStatus === "draft" ? "focus:border-black" : ""
                            }`}
                          />
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2">
                          <input
                            value={row.quantity}
                            onChange={(event) => updateCustomsDebitNoteRow(row.id, "quantity", event.target.value)}
                            readOnly={activeCustomsDebitNoteStatus !== "draft"}
                            placeholder="SL"
                            className={`h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] ${
                              activeCustomsDebitNoteStatus === "draft" ? "focus:border-black" : ""
                            }`}
                          />
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2">
                          <input
                            value={row.unit}
                            onChange={(event) => updateCustomsDebitNoteRow(row.id, "unit", event.target.value)}
                            readOnly={activeCustomsDebitNoteStatus !== "draft"}
                            placeholder="Đơn vị"
                            className={`h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] ${
                              activeCustomsDebitNoteStatus === "draft" ? "focus:border-black" : ""
                            }`}
                          />
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2">
                          <input
                            value={row.price}
                            onChange={(event) => updateCustomsDebitNoteRow(row.id, "price", event.target.value)}
                            readOnly={activeCustomsDebitNoteStatus !== "draft"}
                            placeholder="Đơn giá"
                            className={`h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] ${
                              activeCustomsDebitNoteStatus === "draft" ? "focus:border-black" : ""
                            }`}
                          />
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2 font-medium">
                          <span>{row.amount || "-"}</span>
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2">
                          <input
                            value={row.vatRate}
                            onChange={(event) => updateCustomsDebitNoteRow(row.id, "vatRate", event.target.value)}
                            readOnly={activeCustomsDebitNoteStatus !== "draft"}
                            placeholder="VAT%"
                            className={`h-8 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#C3C7CF] ${
                              activeCustomsDebitNoteStatus === "draft" ? "focus:border-black" : ""
                            }`}
                          />
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2 text-[#9CA3AF]">
                          <span>{row.vatAmount || "-"}</span>
                        </div>
                        <div className="flex min-h-[40px] items-center px-4 py-2 font-semibold">
                          <span>{row.total || "-"}</span>
                        </div>
                        {activeCustomsDebitNoteStatus === "draft" ? (
                          <div className="flex min-h-[40px] items-center justify-end px-2 py-2">
                            <button
                              type="button"
                              onClick={() => deleteCustomsDebitNoteRow(row.id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    {activeCustomsDebitNoteStatus === "draft" ? (
                      <div className="border-b border-[#E7E6E9] bg-white">
                        <button
                          type="button"
                          onClick={addCustomsDebitNoteRow}
                          className="flex h-[38px] items-center px-4 text-[15px] font-medium text-[#4A90E2] transition hover:bg-[#F8FAFF]"
                        >
                          + Thêm dòng phí
                        </button>
                      </div>
                    ) : null}
                    <div
                      className={`grid ${
                        activeCustomsDebitNoteStatus === "draft" ? "grid-cols-[8.5fr_1.2fr_auto]" : "grid-cols-[8.5fr_1.2fr]"
                      } border-t border-[#E7E6E9] bg-[#FCFCFD] text-[15px] text-foreground`}
                    >
                      <div className="px-4 py-3 text-right font-medium">Total Debit Note</div>
                      <div className="px-4 py-3 font-semibold text-[#D14343]">
                        {customsDebitNoteGrandTotal ? `${customsDebitNoteGrandTotal} đ` : "-"}
                      </div>
                      {activeCustomsDebitNoteStatus === "draft" ? <div /> : null}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">Hạn thanh toán:</span>
                  <div className="w-[152px] rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3">
                    <InlineCompactDateField
                      value={activeCustomsDebitNoteDueDate}
                      onChange={(value) =>
                        setCustomsDebitNoteDueDateByType((current) => ({
                          ...current,
                          [customsTradeType]: value
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      textSizeClass="text-[13px] font-medium"
                      heightClass="h-8"
                      readOnly={activeCustomsDebitNoteStatus !== "draft"}
                    />
                  </div>
                </div>
                {activeCustomsDebitNoteStatus === "draft" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setToast({
                          kind: "success",
                          message: "Đã lưu nháp Debit Note."
                        })
                      }
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={sendCustomsDebitNoteForConfirmation}
                      disabled={!activeCustomsDebitNoteDueDate.trim()}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition ${
                        activeCustomsDebitNoteDueDate.trim()
                          ? "bg-[#2054a3] text-white hover:bg-[#1b467d]"
                          : "cursor-not-allowed bg-[#D7DCE8] text-white"
                      }`}
                    >
                      Gửi xác nhận
                    </button>
                  </>
                ) : null}
                {activeCustomsDebitNoteStatus === "pending_confirmation" ? (
                  <>
                    <button
                      type="button"
                      onClick={moveCustomsDebitNoteBackToDraft}
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Đưa về nháp
                    </button>
                    <button
                      type="button"
                      onClick={confirmCustomsDebitNote}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomsDebitNotePreviewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomsDebitNotePreviewOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="text-[18px] font-semibold text-foreground">Debit Note</div>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất PDF Debit Note."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất PDF</span>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                  {visibleDebitNoteFlowSteps.map((step, index) => (
                    <div
                      key={`debit-preview-header-${step.key}`}
                      className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                        index <= activeVisibleCustomsDebitNoteStepIndex
                          ? index === activeVisibleCustomsDebitNoteStepIndex
                            ? "bg-[#2054a3] text-white"
                            : "bg-[#EAF1FB] text-[#245698]"
                          : "bg-[#F3F4F6] text-muted-foreground"
                      } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Đóng modal"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                  onClick={() => setIsCustomsDebitNotePreviewOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="overflow-hidden rounded-[10px] border border-[#1F2937] bg-white">
                <div className="border-b border-[#1F2937] px-5 py-3">
                  <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                    <div className="flex items-center justify-center">
                      <Image
                        src="/pi-doc-logo.png"
                        alt="PI Logistics"
                        width={140}
                        height={84}
                        className="h-auto w-[140px] object-contain"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="text-[16px] font-bold uppercase text-foreground">PI Logistics Corporation</div>
                      <div className="text-[13px] text-foreground">5th Floor, HKC Building, 285 Doi Can Str, Ba Dinh Dist, Hanoi, Vietnam</div>
                      <div className="flex items-center justify-center gap-6 text-[13px] text-foreground">
                        <span>Tel: +84-24-62662669</span>
                        <span>Fax: +84-24-62662660</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-5 py-4 text-center">
                  <div className="text-[20px] font-bold uppercase text-foreground">Debit Note</div>
                </div>

                <div className="grid grid-cols-[160px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-1.5 font-semibold">Khách hàng:</div>
                  <div className="px-4 py-1.5 font-semibold">{shipmentDetailCustomerName}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-1.5 font-semibold">Shipment ID:</div>
                  <div className="px-4 py-1.5 font-semibold">{shipmentDetailNumber}</div>
                </div>
                <div className="grid grid-cols-[160px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-1.5 font-semibold">Ngày vận chuyển:</div>
                  <div className="px-4 py-1.5 font-semibold">
                    {shipmentDetailShipmentDate
                      ? new Date(shipmentDetailShipmentDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })
                      : "-"}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[14px] text-foreground">
                    <thead>
                      <tr className="border-b border-[#1F2937]">
                        {[
                          "Loại chi phí",
                          "Quantity",
                          "Unit",
                          "Price",
                          "Amount",
                          "VAT",
                          "Total",
                          ...(activeCustomsDebitNoteStatus === "draft" ? [""] : [])
                        ].map((label, index) => {
                          const widthClass =
                            index === 0
                              ? "w-[38%] min-w-[340px]"
                              : index === 1
                                ? "w-[64px]"
                                : index === 2
                                  ? "w-[88px]"
                                  : index === 3
                                    ? "w-[88px]"
                                      : index === 4
                                        ? "w-[120px]"
                                      : index === 5
                                        ? "w-[110px]"
                                      : index === 6
                                          ? "w-[126px]"
                                          : "w-[44px]";
                          return (
                            <th
                              key={label}
                              className={`${widthClass} px-3 py-2 text-center font-bold ${
                                index < (activeCustomsDebitNoteStatus === "draft" ? 7 : 6) ? "border-r border-[#1F2937]" : ""
                              }`}
                            >
                              {label}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCustomsDebitNoteRows.map((row) => (
                        <tr key={`debit-preview-${row.id}`} className="border-b border-[#1F2937]">
                          <td className="w-[38%] min-w-[340px] border-r border-[#1F2937] px-3 py-1.5 align-top">
                            <input
                              value={row.feeName}
                              onChange={(event) => updateCustomsDebitNoteRow(row.id, "feeName", event.target.value)}
                              readOnly={activeCustomsDebitNoteStatus !== "draft"}
                              placeholder="Nhập tên phí..."
                              className="w-full bg-transparent text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="w-[64px] border-r border-[#1F2937] px-3 py-1.5 text-center align-top">
                            <input
                              value={row.quantity}
                              onChange={(event) => updateCustomsDebitNoteRow(row.id, "quantity", event.target.value)}
                              readOnly={activeCustomsDebitNoteStatus !== "draft"}
                              placeholder="SL"
                              className="w-full bg-transparent text-center text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="w-[88px] border-r border-[#1F2937] px-3 py-1.5 align-top">
                            <input
                              value={row.unit}
                              onChange={(event) => updateCustomsDebitNoteRow(row.id, "unit", event.target.value)}
                              readOnly={activeCustomsDebitNoteStatus !== "draft"}
                              placeholder="Đơn vị"
                              className="w-full bg-transparent text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="w-[88px] border-r border-[#1F2937] px-3 py-1.5 text-right align-top">
                            <input
                              value={row.price}
                              onChange={(event) => updateCustomsDebitNoteRow(row.id, "price", event.target.value)}
                              readOnly={activeCustomsDebitNoteStatus !== "draft"}
                              placeholder="Đơn giá"
                              className="w-full bg-transparent text-right text-[14px] text-foreground outline-none"
                            />
                          </td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 text-right align-top">{row.amount ? `${row.amount} đ` : "-"}</td>
                          <td className="border-r border-[#1F2937] px-3 py-1.5 text-right align-top">{row.vatAmount ? `${row.vatAmount} đ` : "-"}</td>
                          <td
                            className={`${
                              activeCustomsDebitNoteStatus === "draft" ? "border-r border-[#1F2937]" : ""
                            } px-3 py-1.5 text-right align-top font-semibold`}
                          >
                            {row.total ? `${row.total} đ` : "-"}
                          </td>
                          {activeCustomsDebitNoteStatus === "draft" ? (
                            <td className="px-2 py-1.5 align-top">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => deleteCustomsDebitNoteRow(row.id)}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-[#EEF3FF] hover:text-[#245698]"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.9} />
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={6} className="border-r border-[#1F2937] px-3 py-3 text-center text-[18px] font-bold uppercase">
                          Total of Debit Note
                        </td>
                        <td className={`${activeCustomsDebitNoteStatus === "draft" ? "border-r border-[#1F2937]" : ""} px-3 py-3 text-right text-[18px] font-bold`}>
                          {customsDebitNoteGrandTotal ? `${customsDebitNoteGrandTotal} đ` : "-"}
                        </td>
                        {activeCustomsDebitNoteStatus === "draft" ? <td /> : null}
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 text-[15px] text-foreground">
                  {["Kế toán trưởng", "Trưởng bộ phận", "Người đề nghị"].map((label, index) => (
                    <div key={label} className={`${index < 2 ? "border-r border-[#1F2937]" : ""}`}>
                      <div className="border-b border-[#1F2937] px-3 py-2 text-center">{label}</div>
                      <div className="h-[72px] px-3 py-2" />
                      <div className="px-3 py-2 text-right">{index === 2 ? currentUserName : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">Hạn thanh toán:</span>
                  <div className="w-[152px] rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3">
                    <InlineCompactDateField
                      value={activeCustomsDebitNoteDueDate}
                      onChange={(value) =>
                        setCustomsDebitNoteDueDateByType((current) => ({
                          ...current,
                          [customsTradeType]: value
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      textSizeClass="text-[13px] font-medium"
                      heightClass="h-8"
                      readOnly={activeCustomsDebitNoteStatus !== "draft"}
                    />
                  </div>
                </div>
                {activeCustomsDebitNoteStatus === "draft" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setToast({
                          kind: "success",
                          message: "Đã lưu nháp Debit Note."
                        })
                      }
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={sendCustomsDebitNoteForConfirmation}
                      disabled={!activeCustomsDebitNoteDueDate.trim()}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition ${
                        activeCustomsDebitNoteDueDate.trim()
                          ? "bg-[#2054a3] text-white hover:bg-[#1b467d]"
                          : "cursor-not-allowed bg-[#D7DCE8] text-white"
                      }`}
                    >
                      Gửi xác nhận
                    </button>
                  </>
                ) : null}
                {activeCustomsDebitNoteStatus === "pending_confirmation" ? (
                  <>
                    <button
                      type="button"
                      onClick={moveCustomsDebitNoteBackToDraft}
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Đưa về nháp
                    </button>
                    <button
                      type="button"
                      onClick={confirmCustomsDebitNote}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isCustomsPaymentRequestOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsCustomsPaymentRequestOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="text-[18px] font-semibold text-foreground">Đề nghị thanh toán</div>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất PDF Đề nghị thanh toán."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất PDF</span>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                  {visibleCustomsDebitNoteSteps.map((step, index) => (
                    <div
                      key={`customs-payment-header-${step.key}`}
                      className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                        index <= activeVisibleCustomsPaymentRequestStepIndex
                          ? index === activeVisibleCustomsPaymentRequestStepIndex
                            ? "bg-[#2054a3] text-white"
                            : "bg-[#EAF1FB] text-[#245698]"
                          : "bg-[#F3F4F6] text-muted-foreground"
                      } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Đóng modal"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                  onClick={() => setIsCustomsPaymentRequestOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="overflow-hidden rounded-[10px] border border-[#1F2937] bg-white">
                <div className="border-b border-[#1F2937] px-5 py-3">
                  <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                    <div className="flex items-center justify-center">
                      <Image
                        src="/pi-doc-logo.png"
                        alt="PI Logistics"
                        width={140}
                        height={84}
                        className="h-auto w-[140px] object-contain"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="text-[16px] font-bold uppercase text-foreground">PI Logistics Corporation</div>
                      <div className="text-[13px] text-foreground">5th Floor, HKC Building, 285 Doi Can Str, Ngoc Ha Ward, Hanoi, Vietnam</div>
                      <div className="flex items-center justify-center gap-6 text-[13px] text-foreground">
                        <span>Tel: +84-4-62662669</span>
                        <span>Email: admin@pacific.com.vn</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-5 py-4 text-center">
                  <div className="text-[19px] font-bold uppercase text-foreground">Phiếu đề nghị thanh toán</div>
                  <div className="mt-1 px-6">
                    <input
                      value={customsPaymentRequestDateText}
                      onChange={(event) => setCustomsPaymentRequestDateText(event.target.value)}
                      className="w-full bg-transparent text-center text-[14px] font-semibold italic text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-2 font-semibold">Họ và tên:</div>
                  <div className="px-4 py-2">
                    <input
                      value={customsPaymentRequestFullName}
                      onChange={(event) => setCustomsPaymentRequestFullName(event.target.value)}
                      className="w-full bg-transparent text-[15px] text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-2 font-semibold">Bộ phận:</div>
                  <div className="px-4 py-2">
                    <input
                      value={customsPaymentRequestDepartment}
                      onChange={(event) => setCustomsPaymentRequestDepartment(event.target.value)}
                      className="w-full bg-transparent text-[15px] text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[14px] text-foreground">
                    <thead>
                      <tr className="border-b border-[#1F2937]">
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-bold">STT</th>
                        <th colSpan={2} className="border-r border-[#1F2937] px-2 py-2 text-center font-bold">Chứng từ</th>
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-bold">Diễn giải</th>
                        <th className="px-2 py-2 text-center font-bold">Số tiền (VND)</th>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <th className="border-r border-[#1F2937] px-2 py-2" />
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-semibold">Số</th>
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-semibold">Ngày</th>
                        <th className="border-r border-[#1F2937] px-2 py-2" />
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(8, customsPaymentRequestRows.length) }).map((_, index) => {
                        const row = customsPaymentRequestRows[index];
                        return (
                          <tr key={`payment-request-row-${index}`} className="border-b border-[#1F2937]">
                            <td className="border-r border-[#1F2937] px-2 py-1.5 text-center align-top">{row ? index + 1 : ""}</td>
                            <td className="border-r border-[#1F2937] px-2 py-1.5 align-top">{row ? shipmentDetailNumber : ""}</td>
                            <td className="border-r border-[#1F2937] px-2 py-1.5 align-top">
                              {row ? "02/04/2026" : ""}
                            </td>
                            <td className="border-r border-[#1F2937] px-2 py-1.5 align-top">{row?.feeName || ""}</td>
                            <td className="px-2 py-1.5 text-right align-top">{row?.total ? `${row.total} đ` : ""}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={4} className="border-r border-[#1F2937] px-3 py-1.5 text-right font-bold">Tổng số</td>
                        <td className="px-3 py-1.5 text-right font-bold">{customsDebitNoteGrandTotal ? `${customsDebitNoteGrandTotal} đ` : "-"}</td>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={4} className="border-r border-[#1F2937] px-3 py-1.5 text-right font-bold">Trừ tạm ứng</td>
                        <td className="px-3 py-1.5 text-right font-bold">-</td>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={4} className="border-r border-[#1F2937] px-3 py-1.5 text-right font-bold">Số tiền thanh toán</td>
                        <td className="px-3 py-1.5 text-right font-bold">{customsDebitNoteGrandTotal ? `${customsDebitNoteGrandTotal} đ` : "-"}</td>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={2} className="border-r border-[#1F2937] px-3 py-2.5 font-bold italic">Bằng chữ</td>
                        <td colSpan={3} className="px-3 py-2.5 font-semibold">#ERROR!</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 border-b border-[#1F2937] text-[15px] text-foreground">
                  {["Trưởng bộ phận", "Kế toán trưởng", "Người đề nghị"].map((label, index) => (
                    <div key={label} className={`${index < 2 ? "border-r border-[#1F2937]" : ""}`}>
                      <div className="border-b border-[#1F2937] px-3 py-2 text-center font-bold">{label}</div>
                      <div className="h-[72px] px-3 py-2" />
                      <div className="px-3 py-2 italic">Ngày/tháng: ...............</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 text-[15px] text-foreground">
                  {["Giám đốc duyệt", "Thủ quỹ", "Người nhận"].map((label, index) => (
                    <div key={label} className={`${index < 2 ? "border-r border-[#1F2937]" : ""}`}>
                      <div className="border-b border-[#1F2937] px-3 py-2 text-center font-bold">{label}</div>
                      <div className="h-[72px] px-3 py-2" />
                      <div className="px-3 py-2 italic">Ngày/tháng: ...............</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">Hạn thanh toán:</span>
                  <div className="w-[152px] rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3">
                    <InlineCompactDateField
                      value={activeCustomsPaymentRequestDueDate}
                      onChange={(value) =>
                        setCustomsPaymentRequestDueDateByType((current) => ({
                          ...current,
                          [customsTradeType]: value
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      textSizeClass="text-[13px] font-medium"
                      heightClass="h-8"
                      readOnly={activeCustomsPaymentRequestStatus !== "draft"}
                    />
                  </div>
                </div>
                {activeCustomsPaymentRequestStatus === "draft" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setToast({
                          kind: "success",
                          message: "Đã lưu nháp Đề nghị thanh toán."
                        })
                      }
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={sendCustomsPaymentRequestForConfirmation}
                      disabled={!activeCustomsPaymentRequestDueDate.trim()}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition ${
                        activeCustomsPaymentRequestDueDate.trim()
                          ? "bg-[#2054a3] text-white hover:bg-[#1b467d]"
                          : "cursor-not-allowed bg-[#D7DCE8] text-white"
                      }`}
                    >
                      Gửi xác nhận
                    </button>
                  </>
                ) : null}
                {activeCustomsPaymentRequestStatus === "pending_confirmation" ? (
                  <>
                    <button
                      type="button"
                      onClick={moveCustomsPaymentRequestBackToDraft}
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Đưa về nháp
                    </button>
                    <button
                      type="button"
                      onClick={confirmCustomsPaymentRequest}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : null}
                {activeCustomsPaymentRequestStatus === "pending_payment" ? (
                  <button
                    type="button"
                    onClick={markCustomsPaymentRequestPaid}
                    className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                  >
                    Đã thanh toán
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isInlandPaymentRequestOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4"
          onClick={() => setIsInlandPaymentRequestOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b-[0.5px] border-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="text-[18px] font-semibold text-foreground">Đề nghị thanh toán</div>
                <button
                  type="button"
                  onClick={() =>
                    setToast({
                      kind: "success",
                      message: "Đang xuất PDF Đề nghị thanh toán."
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Xuất PDF</span>
                </button>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                  {visibleCustomsDebitNoteSteps.map((step, index) => (
                    <div
                      key={`inland-payment-header-${step.key}`}
                      className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                        index <= activeVisibleInlandPaymentRequestStepIndex
                          ? index === activeVisibleInlandPaymentRequestStepIndex
                            ? "bg-[#2054a3] text-white"
                            : "bg-[#EAF1FB] text-[#245698]"
                          : "bg-[#F3F4F6] text-muted-foreground"
                      } ${index === 0 ? "" : "ml-[8px]"} [clip-path:polygon(0_0,calc(100%-10px)_0,100%_50%,calc(100%-10px)_100%,0_100%,10px_50%)]`}
                    >
                      {step.label}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Đóng modal"
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                  onClick={() => setIsInlandPaymentRequestOpen(false)}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="overflow-hidden rounded-[10px] border border-[#1F2937] bg-white">
                <div className="border-b border-[#1F2937] px-5 py-3">
                  <div className="grid grid-cols-[150px_1fr] items-center gap-3">
                    <div className="flex items-center justify-center">
                      <Image
                        src="/pi-doc-logo.png"
                        alt="PI Logistics"
                        width={140}
                        height={84}
                        className="h-auto w-[140px] object-contain"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <div className="text-[16px] font-bold uppercase text-foreground">PI Logistics Corporation</div>
                      <div className="text-[13px] text-foreground">5th Floor, HKC Building, 285 Doi Can Str, Ngoc Ha Ward, Hanoi, Vietnam</div>
                      <div className="flex items-center justify-center gap-6 text-[13px] text-foreground">
                        <span>Tel: +84-4-62662669</span>
                        <span>Email: admin@pacific.com.vn</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-[#1F2937] px-5 py-4 text-center">
                  <div className="text-[19px] font-bold uppercase text-foreground">Phiếu đề nghị thanh toán</div>
                  <div className="mt-1 px-6">
                    <input
                      value={inlandPaymentRequestDateText}
                      onChange={(event) => setInlandPaymentRequestDateText(event.target.value)}
                      className="w-full bg-transparent text-center text-[14px] font-semibold italic text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-2 font-semibold">Họ và tên:</div>
                  <div className="px-4 py-2">
                    <input
                      value={inlandPaymentRequestFullName}
                      onChange={(event) => setInlandPaymentRequestFullName(event.target.value)}
                      className="w-full bg-transparent text-[15px] text-foreground outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-[140px_1fr] border-b border-[#1F2937] text-[15px] text-foreground">
                  <div className="border-r border-[#1F2937] px-4 py-2 font-semibold">Bộ phận:</div>
                  <div className="px-4 py-2">
                    <input
                      value={inlandPaymentRequestDepartment}
                      onChange={(event) => setInlandPaymentRequestDepartment(event.target.value)}
                      className="w-full bg-transparent text-[15px] text-foreground outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[14px] text-foreground">
                    <thead>
                      <tr className="border-b border-[#1F2937]">
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-bold">STT</th>
                        <th colSpan={2} className="border-r border-[#1F2937] px-2 py-2 text-center font-bold">Chứng từ</th>
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-bold">Diễn giải</th>
                        <th className="px-2 py-2 text-center font-bold">Số tiền (VND)</th>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <th className="border-r border-[#1F2937] px-2 py-2" />
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-semibold">Số</th>
                        <th className="border-r border-[#1F2937] px-2 py-2 text-center font-semibold">Ngày</th>
                        <th className="border-r border-[#1F2937] px-2 py-2" />
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(8, inlandPaymentRequestRows.length) }).map((_, index) => {
                        const row = inlandPaymentRequestRows[index];
                        return (
                          <tr key={`inland-payment-request-row-${index}`} className="border-b border-[#1F2937]">
                            <td className="border-r border-[#1F2937] px-2 py-1.5 text-center align-top">{row ? index + 1 : ""}</td>
                            <td className="border-r border-[#1F2937] px-2 py-1.5 align-top">{row ? shipmentDetailNumber : ""}</td>
                            <td className="border-r border-[#1F2937] px-2 py-1.5 align-top">{row ? "02/04/2026" : ""}</td>
                            <td className="border-r border-[#1F2937] px-2 py-1.5 align-top">{row?.feeName || ""}</td>
                            <td className="px-2 py-1.5 text-right align-top">{row?.total ? `${row.total} đ` : ""}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={4} className="border-r border-[#1F2937] px-3 py-1.5 text-right font-bold">Tổng số</td>
                        <td className="px-3 py-1.5 text-right font-bold">{inlandDebitNoteGrandTotal ? `${inlandDebitNoteGrandTotal} đ` : "-"}</td>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={4} className="border-r border-[#1F2937] px-3 py-1.5 text-right font-bold">Trừ tạm ứng</td>
                        <td className="px-3 py-1.5 text-right font-bold">-</td>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={4} className="border-r border-[#1F2937] px-3 py-1.5 text-right font-bold">Số tiền thanh toán</td>
                        <td className="px-3 py-1.5 text-right font-bold">{inlandDebitNoteGrandTotal ? `${inlandDebitNoteGrandTotal} đ` : "-"}</td>
                      </tr>
                      <tr className="border-b border-[#1F2937]">
                        <td colSpan={2} className="border-r border-[#1F2937] px-3 py-2.5 font-bold italic">Bằng chữ</td>
                        <td colSpan={3} className="px-3 py-2.5 font-semibold">#ERROR!</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-3 border-b border-[#1F2937] text-[15px] text-foreground">
                  {["Trưởng bộ phận", "Kế toán trưởng", "Người đề nghị"].map((label, index) => (
                    <div key={`inland-${label}`} className={`${index < 2 ? "border-r border-[#1F2937]" : ""}`}>
                      <div className="border-b border-[#1F2937] px-3 py-2 text-center font-bold">{label}</div>
                      <div className="h-[72px] px-3 py-2" />
                      <div className="px-3 py-2 italic">Ngày/tháng: ...............</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 text-[15px] text-foreground">
                  {["Giám đốc duyệt", "Thủ quỹ", "Người nhận"].map((label, index) => (
                    <div key={`inland-bottom-${label}`} className={`${index < 2 ? "border-r border-[#1F2937]" : ""}`}>
                      <div className="border-b border-[#1F2937] px-3 py-2 text-center font-bold">{label}</div>
                      <div className="h-[72px] px-3 py-2" />
                      <div className="px-3 py-2 italic">Ngày/tháng: ...............</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-muted-foreground">Hạn thanh toán:</span>
                  <div className="w-[152px] rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3">
                    <InlineCompactDateField
                      value={activeInlandPaymentRequestDueDate}
                      onChange={(value) =>
                        setInlandPaymentRequestDueDateByType((current) => ({
                          ...current,
                          [inlandTradeType]: value
                        }))
                      }
                      placeholder="dd/mm/yyyy"
                      textSizeClass="text-[13px] font-medium"
                      heightClass="h-8"
                      readOnly={activeInlandPaymentRequestStatus !== "draft"}
                    />
                  </div>
                </div>
                {activeInlandPaymentRequestStatus === "draft" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setToast({
                          kind: "success",
                          message: "Đã lưu nháp Đề nghị thanh toán."
                        })
                      }
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Lưu nháp
                    </button>
                    <button
                      type="button"
                      onClick={sendInlandPaymentRequestForConfirmation}
                      disabled={!activeInlandPaymentRequestDueDate.trim()}
                      className={`inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium transition ${
                        activeInlandPaymentRequestDueDate.trim()
                          ? "bg-[#2054a3] text-white hover:bg-[#1b467d]"
                          : "cursor-not-allowed bg-[#D7DCE8] text-white"
                      }`}
                    >
                      Gửi xác nhận
                    </button>
                  </>
                ) : null}
                {activeInlandPaymentRequestStatus === "pending_confirmation" ? (
                  <>
                    <button
                      type="button"
                      onClick={moveInlandPaymentRequestBackToDraft}
                      className="inline-flex h-8 items-center rounded-full border-[0.5px] border-[#CBCBCB] bg-white px-3 text-[13px] font-medium text-foreground transition hover:bg-[#fafafa]"
                    >
                      Đưa về nháp
                    </button>
                    <button
                      type="button"
                      onClick={confirmInlandPaymentRequest}
                      className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                    >
                      Xác nhận
                    </button>
                  </>
                ) : null}
                {activeInlandPaymentRequestStatus === "pending_payment" ? (
                  <button
                    type="button"
                    onClick={markInlandPaymentRequestPaid}
                    className="inline-flex h-8 items-center rounded-full bg-[#2054a3] px-3 text-[13px] font-medium text-white transition hover:bg-[#1b467d]"
                  >
                    Đã thanh toán
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="pointer-events-none fixed right-6 top-6 z-[60]">
          <div
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_18px_40px_rgba(17,17,17,0.18)] ${
              toast.kind === "success" ? "bg-[#0F9D58]" : "bg-[#F33233]"
            }`}
          >
            <Check className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            <span>{toast.message}</span>
          </div>
        </div>
      ) : null}
    </main>
  );
}
