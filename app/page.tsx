"use client";

import Image from "next/image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
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
  Plus,
  Route,
  Search,
  Settings,
  Settings2,
  UsersRound,
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
  icon: "export" | "import" | "pricing" | "operations" | "customers" | "services" | "settings";
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
type CustomerSubPage = "list" | "contracts" | "services" | "create" | "create-contract";
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

type ServiceConfigFormState = {
  service: string;
  description: string;
  status: ServiceConfigStatus;
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
type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

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
  services: CustomerService[];
  notes: string;
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
    title: "Xuất khẩu",
    icon: "export",
    active: true
  },
  { title: "Nhập khẩu", icon: "import" },
  { title: "Module tính phí", icon: "pricing" },
  {
    title: "Quản lý khách hàng",
    icon: "customers",
    items: [
      { label: "Khách hàng", icon: "folder" },
      { label: "Hợp đồng", icon: "description" },
      { label: "Dịch vụ", icon: "settings" }
    ]
  },
  { title: "Cài đặt", icon: "settings" }
];

const tabs = ["Nháp", "Đang chờ xác nhận", "Đã xác nhận"];
const desktopTableColumns = "176px minmax(0, 1.45fr) minmax(180px, 1.05fr) 120px 180px 150px 120px 49px";
const customerTableColumns =
  "44px minmax(180px,0.92fr) minmax(320px,1.7fr) minmax(190px,1fr) minmax(180px,0.95fr) 208px";
const contractTableColumns =
  "minmax(158px,1.08fr) minmax(231px,1.5fr) minmax(180px,1.05fr) minmax(110px,0.72fr) minmax(151px,0.72fr) minmax(118px,0.63fr) minmax(130px,0.67fr) minmax(214px,1.05fr)";
const serviceConfigTableColumns =
  "minmax(260px,1.45fr) minmax(360px,2.1fr) 180px 180px 160px 49px";
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
  { label: "Khung năm", value: "Khung năm" },
  { label: "Theo chuyến", value: "Theo chuyến" },
  { label: "Dịch vụ logistics", value: "Dịch vụ logistics" }
];
const contractStatusCreateOptions: SelectOption[] = [
  { label: "Nháp", value: "draft" },
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã chấp thuận", value: "accepted" },
  { label: "Đang hiệu lực", value: "active" },
  { label: "Sắp hết hạn", value: "expiring_soon" },
  { label: "Hết hiệu lực", value: "expired" },
  { label: "Đã chấm dứt", value: "terminated" }
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

function HeaderIconButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="ui-hover-card flex h-8 w-8 items-center justify-center rounded-full border border-[#D7D7D7] bg-white text-foreground transition hover:bg-[#fafafa]">
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
    label: "Đã chấp thuận",
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
    label: "Hết hiệu lực",
    className: "bg-[#F33233] text-white"
  },
  terminated: {
    label: "Đã chấm dứt",
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
  matchDropdownWidth = false
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
        <div className="grid grid-cols-[144px_minmax(0,1fr)] items-center gap-4 px-0 py-0">
          <div className="py-2 pr-4 text-[15px] font-semibold text-foreground">
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
  readOnly = false
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[144px_minmax(0,1fr)] items-center gap-4 px-0 py-0">
        <div className="py-2 pr-4 text-[15px] font-semibold text-foreground">{label}</div>
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
  heightClass = "h-7"
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  textSizeClass?: string;
  heightClass?: string;
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex ${heightClass} w-full items-center justify-between gap-2 border-0 px-0 text-left ${textSizeClass} text-foreground transition-colors`}
      >
        <span className={value ? "text-foreground" : "text-[#9CA3AF]"}>
          {options.find((option) => option.value === value)?.label ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`} strokeWidth={1.8} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-64 min-w-[180px] w-[50%] overflow-y-auto rounded-[12px] border border-[#DADCE3] bg-[#f7f7f7] shadow-[0_12px_24px_rgba(17,17,17,0.12)]">
          {options.map((option, index) => {
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
  const contractImportInputRef = useRef<HTMLInputElement | null>(null);
  const customerImportInputRef = useRef<HTMLInputElement | null>(null);
  const customerAddressInlineFormRef = useRef<HTMLDivElement | null>(null);
  const customerContactInlineFormRef = useRef<HTMLDivElement | null>(null);
  const customerRouteInlineFormRef = useRef<HTMLDivElement | null>(null);
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
  const [deletedCustomerKeys, setDeletedCustomerKeys] = useState<string[]>([]);
  const [selectedSearchFilters, setSelectedSearchFilters] = useState<Record<string, string[]>>({});
  const [selectedSearchGroupOptions, setSelectedSearchGroupOptions] = useState<string[]>([]);
  const [isCustomerImportModalOpen, setIsCustomerImportModalOpen] = useState(false);
  const [isContractImportModalOpen, setIsContractImportModalOpen] = useState(false);
  const [isServiceConfigModalOpen, setIsServiceConfigModalOpen] = useState(false);
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
  const [contractScanFileName, setContractScanFileName] = useState("");
  const [contractCreateUploadFileName, setContractCreateUploadFileName] = useState("");
  const [customerImportFileName, setCustomerImportFileName] = useState("");
  const [contractImportFileName, setContractImportFileName] = useState("");
  const [contractScanFileUrl, setContractScanFileUrl] = useState("");
  const [contractScanUpdatedAt, setContractScanUpdatedAt] = useState("");
  const [customerCreateWorkspaceTab, setCustomerCreateWorkspaceTab] = useState<"address" | "contacts" | "routes" | "notes">("address");
  const [contractCreateWorkspaceTab, setContractCreateWorkspaceTab] = useState<"services" | "file" | "notes">("services");
  const [recentCustomerSearches, setRecentCustomerSearches] = useState<string[]>([]);
  const [recentOriginPortSearches, setRecentOriginPortSearches] = useState<string[]>([]);
  const [recentDestinationPortSearches, setRecentDestinationPortSearches] = useState<string[]>([]);
  const [openSidebarGroups, setOpenSidebarGroups] = useState<string[]>([]);
  const [serviceConfigForm, setServiceConfigForm] = useState<ServiceConfigFormState>({
    service: "",
    description: "",
    status: "draft"
  });
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
    notes: ""
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
  const allBookingRows = Object.values(rowsByTab).flat();
  const isCustomerPage = currentPage === "customers";
  const isCustomerListPage = currentPage === "customers" && customerSubPage === "list" && !selectedCustomerKey;
  const isCustomerCreatePage = currentPage === "customers" && customerSubPage === "create";
  const isCustomerContractCreatePage = currentPage === "customers" && customerSubPage === "create-contract";
  const isCustomerContractsPage =
    currentPage === "customers" && customerSubPage === "contracts" && !selectedContractCode;
  const isCustomerServicesPage = currentPage === "customers" && customerSubPage === "services";
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
  const extraCustomerNames = Array.from({ length: 100 }, (_, index) => {
    const prefix = extraCustomerPrefixes[index % extraCustomerPrefixes.length];
    const industry = extraCustomerIndustries[index % extraCustomerIndustries.length];
    const suffix = extraCustomerSuffixes[Math.floor(index / extraCustomerPrefixes.length) % extraCustomerSuffixes.length];
    const descriptor = extraLongDescriptors[index % extraLongDescriptors.length];
    return `${prefix} ${industry} ${suffix} ${descriptor}`.replace(/\s+/g, " ").trim();
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

    return {
      code: `${(row.contractCompany.split(" / ")[0] ?? "PIL")}-CNT-2025-${String(index + 1).padStart(3, "0")}`,
      customer: row.customer,
      contractCompany: row.contractCompany,
      services: [...row.services],
      contractType:
        index % 3 === 0 ? "Service Contract" : index % 3 === 1 ? "Framework Agreement" : "Spot Agreement",
      term,
      status,
      signedAt: `${String(10 + (index % 18)).padStart(2, "0")}/03/2025`
    };
  });
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
  const selectedCustomerRow = selectedCustomerKey
    ? customerRows.find((row) => row.customer === selectedCustomerKey) ?? null
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
  const emptyCustomerAddressRows = Math.max(0, 5 - customerAddressRows.length);
  const emptyCustomerContactRows = Math.max(0, 5 - customerContactRows.length);
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
          : isContractDetailsPage && selectedContractRow
            ? `${selectedContractRow.code} | PI Digital`
          : isCustomerDetailsPage && selectedCustomerRow
            ? `${selectedCustomerRow.customer} | PI Digital`
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
          : isContractDetailsPage && selectedContractRow
            ? `Chi tiết hợp đồng ${selectedContractRow.code} trong hệ thống PI Digital.`
          : isCustomerDetailsPage && selectedCustomerRow
            ? `Chi tiết khách hàng ${selectedCustomerRow.customer} trong hệ thống PI Digital.`
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
    isCustomerCreatePage,
    isCustomerContractCreatePage,
    isContractDetailsPage,
    isCustomerContractsPage,
    isCustomerDetailsPage,
    isCustomerListPage,
    isCustomerServicesPage,
    selectedBookingCode,
    selectedContractRow,
    selectedCustomerRow
  ]);
  const customerShipmentRows = selectedCustomerRow
    ? allBookingRows
        .filter((row) => row.customer === selectedCustomerRow.customer)
        .sort((left, right) => parseDisplayDate(right.createdAt) - parseDisplayDate(left.createdAt))
    : [];
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
    : "Tìm kiếm theo tên KH, MST, Mã KH, Email, SĐT";
  const searchFilterSections = [
    {
      title: "Công ty phụ trách",
      items: ["PIL", "TDB"],
    },
    {
      title: "Dịch vụ",
      items: ["Ocean FCL", "Ocean LCL", "Air Freight", "Trucking", "Warehouse", "Custom Clearance"],
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
  const activeSearchFilterSections = isCustomerContractsPage ? contractSearchFilterSections : searchFilterSections;
  const searchGroupOptions = ["Công ty phụ trách", "Loại KH", "Loại dịch vụ", "Tháng tạo", "Trạng thái"] as const;
  const contractSearchGroupOptions = ["Loại HĐ", "Loại dịch vụ", "Tháng tạo"] as const;
  const activeSearchGroupOptions = isCustomerContractsPage ? contractSearchGroupOptions : searchGroupOptions;
  const currentPageTitle = isCustomerPage
    ? isCustomerCreatePage
      ? "Thêm mới"
      : isCustomerContractCreatePage
        ? "Hợp đồng"
        : isCustomerContractsPage
          ? "Hợp đồng"
          : isCustomerServicesPage
            ? "Cấu hình dịch vụ"
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
  const isCustomerSelectionMode = isCustomerListPage && selectedCustomerRowKeys.length > 0;
  const customerCreateWorkflowSteps =
    isCustomerDetailsPage && selectedCustomerRow?.status === "locked"
      ? (["Nháp", "Đang hoạt động", "Đã khóa"] as const)
      : (["Nháp", "Đang hoạt động"] as const);
  const contractCreateWorkflowSteps = ["Nháp", "Đang hiệu lực"] as const;
  const customerCreateSummaryRow = isCustomerDetailsPage ? selectedCustomerRow : matchedCustomerCreateRow;
  const shouldHideCustomerDetailMetrics = isCustomerDetailsPage && selectedCustomerRow?.status === "draft";
  const customerCreateHeaderMetrics = [
    {
      label: "Hợp đồng",
      value: shouldHideCustomerDetailMetrics
        ? 0
        : customerCreateSummaryRow
          ? contractRows.filter((row) => row.customer === customerCreateSummaryRow.customer).length
          : 0,
    },
    {
      label: "Shipments",
      value: shouldHideCustomerDetailMetrics ? 0 : customerCreateSummaryRow?.totalBookings ?? 0,
    },
    {
      label: "Báo giá",
      value: shouldHideCustomerDetailMetrics
        ? 0
        : customerCreateSummaryRow
          ? Math.max(1, Math.ceil(customerCreateSummaryRow.totalBookings / 2))
          : 0,
    },
    {
      label: "Phân tích",
      value: shouldHideCustomerDetailMetrics
        ? 0
        : customerCreateSummaryRow
          ? Math.max(1, Math.ceil(customerCreateSummaryRow.totalBookings / 3))
          : 0,
    },
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
  const contractCreateActivityGroups = [
    {
      label: "Hôm nay",
      entries: contractCreateActivityRows
    }
  ];
  const isAnyCreatePage = isCreatePage || isCustomerCreateLikePage || isCustomerContractCreatePage;
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
  const visibleServiceConfigRows = serviceConfigRows.filter((row) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return [row.service, row.description].join(" ").toLowerCase().includes(normalizedSearchQuery);
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
  const selectedCustomerStatusLabel = selectedCustomerRow
    ? customerAccountStatusMeta[selectedCustomerRow.status].label
    : "";
  const selectedCustomerToggleLabel = selectedCustomerRow?.status === "locked" ? "Mở khóa" : "Khóa";
  const selectedContractCustomerRow = selectedContractRow
    ? customerRows.find((row) => row.customer === selectedContractRow.customer) ?? null
    : null;
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
      setCurrentPage(nextPage);
      setCustomerSubPage(
        nextPage === "customers"
          ? nextParams.get("view") === "contracts"
            ? "contracts"
            : nextParams.get("view") === "services"
              ? "services"
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
          nextParams.get("view") !== "create-contract" &&
          nextParams.get("view") !== "create-customer"
          ? nextParams.get("customer")
          : null
      );
      setSelectedContractCode(
        nextPage === "customers" && nextParams.get("view") === "contracts" ? nextParams.get("contract") : null
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
    if (isCustomerPage) {
      setOpenSidebarGroups((current) =>
        current.includes("Quản lý khách hàng") ? current : [...current, "Quản lý khách hàng"]
      );
      return;
    }

    setOpenSidebarGroups((current) => current.filter((title) => title !== "Quản lý khách hàng"));
  }, [isCustomerPage]);

  useEffect(() => {
    setCustomerShipmentPage(1);
  }, [selectedCustomerKey]);

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

  const handleSaveCustomerDraft = () => {
    setCustomerCreateErrors({});
    setToast({
      kind: "success",
      message: "Đã lưu nháp khách hàng."
    });
  };

  const handleSaveContract = () => {
    setToast({
      kind: "success",
      message: "Tạo mới hợp đồng thành công."
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
    setContractCreateForm(initialContractCreateForm);
    setContractCreateUploadFileName("");
    setContractCreateWorkspaceTab("services");
  };

  const openCreateContract = () => {
    runWithLeaveGuard(performOpenCreateContract);
  };

  const goBackFromCreatePage = () => {
    if (isCustomerContractCreatePage) {
      showCustomerContracts();
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
    nextParams.set("page", "customers");
    nextParams.set("view", "services");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("customers");
    setCustomerSubPage("services");
    setSelectedBookingCode(null);
    setSelectedCustomerKey(null);
    setSelectedContractCode(null);
  };

  const showCustomerServices = () => {
    runWithLeaveGuard(performShowCustomerServices);
  };

  const openServiceConfigModal = () => {
    setServiceConfigForm({
      service: "",
      description: "",
      status: "draft"
    });
    setIsServiceConfigModalOpen(true);
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
    contractCreateForm.notes !== initialContractCreateForm.notes ||
    contractCreateUploadFileName !== "";
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

  return (
    <main className="h-screen overflow-hidden bg-background">
      <div className="flex h-screen w-full flex-col overflow-visible bg-background">
        <div className="flex flex-1 items-start overflow-hidden">
          <div className="hidden w-[240px] shrink-0 lg:block" aria-hidden="true" />

          <aside className="fixed left-0 top-0 hidden h-screen w-[240px] bg-sidebar lg:block">
            <div className="sticky top-0 z-10 flex h-14 items-center bg-sidebar px-6">
              <SidebarLogo onClick={showBookingList} />
            </div>
            <div className="border-b-[0.5px] border-border" />
            <div className="flex h-[calc(100vh-56px)] flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-2">
                <div className="space-y-0">
                {sidebarGroups.map((group) => (
                  <div key={group.title} className="rounded-2xl">
                    {(() => {
                      const isGroupOpen = group.items ? openSidebarGroups.includes(group.title) : false;
                      const isCustomersGroup = group.title === "Quản lý khách hàng";
                      const isGroupActive = group.title === "Xuất khẩu" ? !isCustomerPage : false;
                      return (
                        <>
                    <button
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition-colors ${
                        isGroupActive
                          ? "bg-card font-medium text-[#18181b]"
                          : "ui-hover-bg text-foreground"
                      }`}
                      onClick={() => {
                        if (group.items) {
                          setOpenSidebarGroups((current) =>
                            current.includes(group.title)
                              ? current.filter((title) => title !== group.title)
                              : [...current, group.title]
                          );
                          return;
                        }

                        if (group.title === "Xuất khẩu") {
                          showBookingList();
                        }
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <SidebarGroupIcon
                          icon={group.icon}
                          className={isGroupActive ? "text-[#18181b]" : "text-muted-foreground"}
                        />
                        <span>{group.title}</span>
                      </span>
                      {group.items ? (
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${isGroupOpen ? "" : "-rotate-90"}`}
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
                              isCustomersGroup &&
                              ((item.label === "Khách hàng" && (isCustomerListPage || isCustomerDetailsPage || isCustomerCreatePage)) ||
                                (item.label === "Hợp đồng" && (isCustomerContractsPage || isContractDetailsPage || isCustomerContractCreatePage)) ||
                                (item.label === "Dịch vụ" && isCustomerServicesPage))
                                ? "bg-card text-[#18181b]"
                                : "ui-hover-bg text-foreground"
                            }`}
                            onClick={
                              isCustomersGroup && item.label === "Khách hàng"
                                ? showCustomerList
                                : isCustomersGroup && item.label === "Hợp đồng"
                                  ? showCustomerContracts
                                  : isCustomersGroup && item.label === "Dịch vụ"
                                    ? showCustomerServices
                                : undefined
                            }
                          >
                            <span
                              className={`h-[2px] w-[2px] rounded-full ${
                                isCustomersGroup &&
                                ((item.label === "Khách hàng" && (isCustomerListPage || isCustomerDetailsPage || isCustomerCreatePage)) ||
                                  (item.label === "Hợp đồng" && (isCustomerContractsPage || isContractDetailsPage)) ||
                                  (item.label === "Dịch vụ" && isCustomerServicesPage))
                                  ? "bg-[#18181b]"
                                  : "bg-muted-foreground"
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
                  className="ui-hover-card flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold text-white ${getAvatarColorClass(currentUserName)}`}>
                    {currentUserName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{currentUserName}</span>
                  </span>
                </button>
              </div>
            </div>
          </aside>

          <section className={`flex h-screen flex-1 flex-col bg-background px-4 py-3 md:px-6 md:py-3 ${isAnyCreatePage ? "overflow-y-auto" : "overflow-hidden"}`}>
            <div className="-mx-4 mb-0 border-b-[0.5px] border-border md:-mx-6">
              <div className="flex flex-col gap-3 px-4 pb-3 md:px-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-[16px] font-semibold leading-[1.2] text-foreground">
                      <span>{isCustomerPage ? "Quản lý khách hàng" : "Xuất khẩu"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <HeaderIconButton>
                      <MessagesSquare className="h-4 w-4" strokeWidth={1.8} />
                    </HeaderIconButton>
                    <HeaderIconButton>
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
                            if (isCustomerServicesPage) {
                              openServiceConfigModal();
                              return;
                            }

                            if (isCustomerContractsPage) {
                              openCreateContract();
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
                      {isCustomerCreateLikePage || isCustomerContractCreatePage ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={goBackFromCreatePage}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-[#fafafa]"
                            aria-label="Quay lại"
                          >
                            <ChevronLeft className="h-5 w-5 text-[#2054a3]" strokeWidth={2.2} />
                          </button>
                          <div className="leading-[1.2]">
                            <div className="text-[16px] font-medium text-foreground">
                              {isCustomerDetailsPage ? "Khách hàng" : currentPageTitle}
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
                      ) : isCustomerListPage || isCustomerContractsPage ? (
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
                              {[
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
                      ) : (
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
                                className="inline-flex h-10 items-center rounded-full border-[0.5px] border-input bg-card px-4 text-base font-medium text-foreground shadow-subtle transition hover:bg-[#fafafa] active:bg-[#f2f2f2]"
                              >
                                <span>{`${item.value} ${item.label}`}</span>
                              </button>
                            ))}
                          </div>
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
                            isCustomerSelectionMode || isCustomerCreateLikePage || isCustomerContractCreatePage ? "hidden" : ""
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
                            <div className="text-base text-foreground">{selectedContractRow.services.join(", ") || "-"}</div>
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
                    {["", "Mã KH", "Tên khách hàng", "Loại KH", "Công ty phụ trách", "Trạng thái"].map((label, index) => (
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
                            <span className="block truncate whitespace-nowrap">{row.customerType}</span>
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
                            <div>
                              <span className="text-muted-foreground">Loại KH: </span>
                              {row.customerType}
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
                              <span className="text-muted-foreground">Trạng thái: </span>
                              <span className="inline-flex align-middle">
                                <CustomerAccountStatusTag status={row.status} />
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Nhóm khách hàng: </span>
                              {row.customerGroup}
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

                        <div className="grid gap-x-8 gap-y-5 px-5 pb-5 pt-0 lg:grid-cols-2">
                          <div className="space-y-0">
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
                              label="Nhóm KH"
                              value={customerCreateForm.customerGroup}
                              error={customerCreateErrors.customerGroup}
                              options={customerGroupOptions}
                              variant="inlineUnderline"
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onChange={(value) => updateCustomerCreateForm("customerGroup", value)}
                            />
                            <FormField
                              label="Loại KH"
                              value={customerCreateForm.customerType}
                              error={customerCreateErrors.customerType}
                              options={customerTypeOptions}
                              variant="inlineUnderline"
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onChange={(value) => updateCustomerCreateForm("customerType", value)}
                            />
                            <InlineDropdownField
                              label="Dịch vụ"
                              values={customerCreateForm.services}
                              options={customerCreateServiceOptions}
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onToggle={(value) => toggleCustomerCreateMultiValue("services", value)}
                              error={customerCreateErrors.services}
                            />
                            <FormField
                              label="Mức độ ưu tiên"
                              value={customerCreateForm.priority}
                              options={customerPriorityOptions.map((option) => ({
                                label: option.label,
                                value: option.value
                              }))}
                              variant="inlineUnderline"
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onChange={(value) => updateCustomerCreateForm("priority", value)}
                            />
                          </div>

                          <div className="space-y-0">
                            <FormField
                              label="Nhân viên KD"
                              value={customerCreateForm.salesperson}
                              error={customerCreateErrors.salesperson}
                              options={customerSalespersonOptions}
                              variant="inlineUnderline"
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onChange={(value) => updateCustomerCreateForm("salesperson", value)}
                            />
                            <FormField
                              label="Nguồn KH"
                              value={customerCreateForm.source}
                              error={customerCreateErrors.source}
                              options={customerSourceOptions}
                              variant="inlineUnderline"
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onChange={(value) => updateCustomerCreateForm("source", value)}
                            />
                            <InlineDropdownField
                              label="Công ty phụ trách"
                              values={customerCreateForm.responsibleCompanies}
                              options={customerResponsibleCompanyOptions}
                              readOnly={isCustomerDetailsPage && !isCustomerDetailEditable}
                              onToggle={(value) => toggleCustomerCreateMultiValue("responsibleCompanies", value)}
                              error={customerCreateErrors.responsibleCompanies}
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

                        <div className="mt-0 border-t border-[#E7E6E9]">
                          <div className="flex flex-wrap items-end gap-0 border-b border-[#E7E6E9] px-5 pt-0">
                            {[
                              { key: "address", label: "Địa chỉ" },
                              { key: "contacts", label: "Liên hệ" },
                              { key: "routes", label: "Tuyến hàng" },
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
                                      <div className="px-4 py-2">{row.addressType || "-"}</div>
                                    </div>
                                  ))}
                                  {isCustomerAddressFormOpen ? (
                                    <div
                                      ref={customerAddressInlineFormRef}
                                      className="grid grid-cols-[1.45fr_1.45fr_1.1fr_1fr_0.9fr_1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="px-4 py-2">
                                        <input
                                          value={customerAddressForm.line1}
                                          onChange={(event) =>
                                            setCustomerAddressForm((current) => ({ ...current, line1: event.target.value }))
                                          }
                                          placeholder="Số nhà, tên đường"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="px-4 py-2">
                                        <input
                                          value={customerAddressForm.line2}
                                          onChange={(event) =>
                                            setCustomerAddressForm((current) => ({ ...current, line2: event.target.value }))
                                          }
                                          placeholder="Phường/Xã, Quận/Huyện"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="px-4 py-2">
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
                                      <div className="px-4 py-2">
                                        <TableDropdownField
                                          value={customerAddressForm.city}
                                          options={customerAddressCityOptions}
                                          onChange={(value) =>
                                            setCustomerAddressForm((current) => ({ ...current, city: value }))
                                          }
                                        />
                                      </div>
                                      <div className="px-4 py-2">
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
                                      <div className="px-4 py-2">
                                        <TableDropdownField
                                          value={customerAddressForm.addressType}
                                          options={customerAddressTypeOptions}
                                          onChange={(value) =>
                                            setCustomerAddressForm((current) => ({ ...current, addressType: value }))
                                          }
                                        />
                                      </div>
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
                                      <div className="px-4 py-2">{row.notes || "-"}</div>
                                    </div>
                                  ))}
                                  {isCustomerContactFormOpen ? (
                                    <div
                                      ref={customerContactInlineFormRef}
                                      className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_0.9fr_1.1fr] border-b border-[#E7E6E9] bg-[#FCFCFD] text-[14px] text-foreground"
                                    >
                                      <div className="px-4 py-2">
                                        <input
                                          value={customerContactForm.fullName}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, fullName: event.target.value }))
                                          }
                                          placeholder="Tên liên hệ đầy đủ"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="px-4 py-2">
                                        <TableDropdownField
                                          value={customerContactForm.role}
                                          options={customerContactRoleOptions}
                                          onChange={(value) =>
                                            setCustomerContactForm((current) => ({ ...current, role: value }))
                                          }
                                        />
                                      </div>
                                      <div className="px-4 py-2">
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
                                      <div className="px-4 py-2">
                                        <input
                                          value={customerContactForm.email}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, email: event.target.value }))
                                          }
                                          placeholder="Email"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
                                      <div className="px-4 py-2">
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
                                      <div className="px-4 py-2">
                                        <input
                                          value={customerContactForm.notes}
                                          onChange={(event) =>
                                            setCustomerContactForm((current) => ({ ...current, notes: event.target.value }))
                                          }
                                          placeholder="Ghi chú đặc biệt về liên hệ này"
                                          className="h-10 w-full border-b border-transparent bg-transparent px-0 text-[15px] text-foreground outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-black"
                                        />
                                      </div>
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

            {isCustomerContractCreatePage ? (
              <div className={`mt-1 pr-1 ${isAnyCreatePage ? "min-h-fit overflow-visible" : "min-h-0 flex-1 overflow-y-auto"}`}>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-0">
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-full border-[0.5px] border-[#D8D8D8] bg-[#F3F4F6] px-2.5 text-[13px] font-medium text-[#9CA3AF] opacity-100"
                    >
                      <Mail className="h-4 w-4 text-[#9CA3AF]" strokeWidth={1.9} />
                      Gửi email
                    </button>
                    <div className="flex flex-wrap items-center gap-0 overflow-hidden rounded-[6px]">
                      {contractCreateWorkflowSteps.map((step, index) => (
                        <div
                          key={step}
                          className={`relative px-3 py-1.5 text-[13px] font-medium leading-none ${
                            ((contractCreateForm.status === "draft" ? index === 0 : index === 1))
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
                              Thêm mới Hợp đồng
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-x-8 gap-y-5 px-5 pb-5 pt-0 lg:grid-cols-2">
                          <div className="space-y-0">
                            <FormField
                              label="Khách hàng"
                              value={contractCreateForm.customer}
                              options={[
                                { label: "Chọn khách hàng", value: "" },
                                ...customerRows
                                  .filter((row) => row.status === "active")
                                  .map((row) => ({ label: row.customer, value: row.customer }))
                              ]}
                              placeholder="Chọn khách hàng"
                              variant="inlineUnderline"
                              autoSelectFirstOption={false}
                              matchDropdownWidth
                              onChange={(value) => setContractCreateForm((current) => ({ ...current, customer: value }))}
                            />
                            <FormField
                              label="Công ty"
                              value={contractCreateForm.contractCompany}
                              options={[
                                { label: "Chọn công ty", value: "" },
                                { label: "PIL", value: "PIL" },
                                { label: "TDB", value: "TDB" }
                              ]}
                              variant="inlineUnderline"
                              onChange={(value) => setContractCreateForm((current) => ({ ...current, contractCompany: value }))}
                            />
                            <FormField
                              label="Loại hợp đồng"
                              value={contractCreateForm.contractType}
                              options={[
                                { label: "Chọn loại hợp đồng", value: "" },
                                { label: "Service Contract", value: "Service Contract" },
                                { label: "Framework Agreement", value: "Framework Agreement" },
                                { label: "Spot Agreement", value: "Spot Agreement" }
                              ]}
                              variant="inlineUnderline"
                              onChange={(value) => setContractCreateForm((current) => ({ ...current, contractType: value }))}
                            />
                            <InlineDropdownField
                              label="Dịch vụ áp dụng"
                              values={contractCreateForm.services}
                              options={["Ocean FCL", "Air Freight", "Trucking", "Warehouse"]}
                              onToggle={(value) =>
                                setContractCreateForm((current) => ({
                                  ...current,
                                  services: current.services.includes(value as CustomerService)
                                    ? current.services.filter((item) => item !== value)
                                    : [...current.services, value as CustomerService]
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-0">
                            <FormField
                              label="Ngày hiệu lực"
                              type="date"
                              value={contractCreateForm.validFrom}
                              variant="inlineUnderline"
                              onChange={(value) => setContractCreateForm((current) => ({ ...current, validFrom: value }))}
                            />
                            <FormField
                              label="Ngày hết hạn"
                              type="date"
                              value={contractCreateForm.validTo}
                              variant="inlineUnderline"
                              onChange={(value) => setContractCreateForm((current) => ({ ...current, validTo: value }))}
                            />
                            <FormField
                              label="Ngày ký kết"
                              type="date"
                              value={contractCreateForm.signedAt}
                              variant="inlineUnderline"
                              onChange={(value) => setContractCreateForm((current) => ({ ...current, signedAt: value }))}
                            />
                          </div>
                        </div>

                        <div className="mt-0 border-t border-[#E7E6E9]">
                          <div className="flex flex-wrap items-end gap-0 border-b border-[#E7E6E9] px-5 pt-0">
                            {[
                              { key: "services", label: "Dịch vụ" },
                              { key: "file", label: "Tệp hợp đồng" },
                              { key: "notes", label: "Ghi chú" }
                            ].map((tab) => {
                              const isActive = contractCreateWorkspaceTab === tab.key;
                              return (
                                <button
                                  key={tab.key}
                                  type="button"
                                  onClick={() => setContractCreateWorkspaceTab(tab.key as "services" | "file" | "notes")}
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

                          <div className="px-5 py-0">
                            {contractCreateWorkspaceTab === "services" ? (
                              <div className="px-4 py-4">
                                <div className="text-[14px] text-muted-foreground">
                                  Dịch vụ áp dụng được cấu hình trong phần thông tin chung của hợp đồng.
                                </div>
                              </div>
                            ) : contractCreateWorkspaceTab === "file" ? (
                              <div className="px-4 py-4">
                                <input
                                  ref={contractCreateUploadInputRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xlsx,.xls"
                                  className="hidden"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    setContractCreateUploadFileName(file?.name ?? "");
                                    if (file?.name) {
                                      setToast({
                                        kind: "success",
                                        message: `Đã đính kèm file ${file.name}.`
                                      });
                                    }
                                  }}
                                />

                                <button
                                  type="button"
                                  className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-[16px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 text-center transition hover:border-[#245698] hover:bg-[#F2F7FD]"
                                  onClick={() => contractCreateUploadInputRef.current?.click()}
                                >
                                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#245698] shadow-[0_6px_18px_rgba(36,86,152,0.12)]">
                                    <Upload className="h-5 w-5" strokeWidth={1.8} />
                                  </span>
                                  <div className="mt-4 text-sm font-semibold text-foreground">
                                    {contractCreateUploadFileName ? contractCreateUploadFileName : "Chọn file hợp đồng"}
                                  </div>
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Hỗ trợ `.pdf`, `.doc`, `.docx`, `.xlsx`, `.xls`.
                                  </p>
                                </button>
                              </div>
                            ) : (
                              <div className="px-4 py-4">
                                <div className="max-w-[980px] space-y-3">
                                  <TiptapRichTextEditor
                                    value={contractCreateForm.notes}
                                    onChange={(value) => setContractCreateForm((current) => ({ ...current, notes: value }))}
                                    placeholder="Ghi chú nội bộ. Không gửi cho KH. Ghi thông tin đặc biệt về hợp đồng"
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
                    {["Số HĐ", "Khách hàng", "Loại HĐ", "Công ty", "Dịch vụ", "Ngày hiệu lực", "Ngày hết hạn", "Trạng thái"].map((label, index) => (
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
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                {row.contractCompany.split(" / ").map((company) => (
                                  <span
                                    key={`${row.code}-${company}`}
                                    className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-foreground"
                                  >
                                    {company}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className={`flex h-12 w-full min-w-0 items-center justify-start overflow-hidden px-4 text-left text-sm text-foreground ${index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                              <span className="block truncate whitespace-nowrap">{row.services.join(", ") || "-"}</span>
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
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground">Công ty ký hợp đồng: </span>
                            {row.contractCompany.split(" / ").map((company) => (
                              <span
                                key={`${row.code}-mobile-${company}`}
                                className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-foreground"
                              >
                                {company}
                              </span>
                            ))}
                          </div>
                          <div><span className="text-muted-foreground">Dịch vụ: </span>{row.services.join(", ") || "-"}</div>
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
                    {["Dịch vụ", "Mô tả", "Khách hàng sử dụng", "Hợp đồng sử dụng", "Trạng thái", ""].map((label, index) => (
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
                          key={row.service}
                          className="grid bg-card transition-colors hover:bg-[#B6E1FF]"
                          style={{ gridTemplateColumns: serviceConfigTableColumns }}
                        >
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start pl-6 pr-4 text-left text-sm font-semibold text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.service}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.description}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.customerCount}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.contractCount}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <CustomerAccountStatusTag status={row.status} />
                          </div>
                          <div className={`flex h-12 items-center justify-center px-3 ${index === paginatedServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <button
                              type="button"
                              aria-label={`Tác vụ cho ${row.service}`}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" strokeWidth={1.8} />
                            </button>
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
                        <article key={row.service} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-[#B6E1FF]">
                          <div className="text-sm font-semibold text-foreground">{row.service}</div>
                          <div className="mt-3 space-y-2 text-sm text-foreground">
                            <div>
                              <span className="text-muted-foreground">Mô tả: </span>
                              {row.description}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Khách hàng sử dụng: </span>
                              {row.customerCount}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hợp đồng sử dụng: </span>
                              {row.contractCount}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Trạng thái: </span>
                              <span className="inline-flex align-middle">
                                <CustomerAccountStatusTag status={row.status} />
                              </span>
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
          </section>
        </div>
      </div>

      {isServiceConfigModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,17,17,0.42)] px-4" onClick={() => setIsServiceConfigModalOpen(false)}>
          <div
            className="w-full max-w-[560px] rounded-[20px] bg-card shadow-[0_24px_62px_rgba(17,17,17,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[0.5px] border-border px-5 py-4">
              <div>
                <div className="text-lg font-semibold text-foreground">Thêm dịch vụ</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tạo cấu hình dịch vụ dùng chung cho khách hàng và hợp đồng.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng modal"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                onClick={() => setIsServiceConfigModalOpen(false)}
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Tên dịch vụ</div>
                <input
                  value={serviceConfigForm.service}
                  onChange={(event) =>
                    setServiceConfigForm((current) => ({
                      ...current,
                      service: event.target.value
                    }))
                  }
                  placeholder="Nhập tên dịch vụ"
                  className="min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Mô tả</div>
                <textarea
                  value={serviceConfigForm.description}
                  onChange={(event) =>
                    setServiceConfigForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder="Nhập mô tả dịch vụ"
                  rows={4}
                  className="min-h-[110px] w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Trạng thái</div>
                <div className="relative">
                  <select
                    value={serviceConfigForm.status}
                    onChange={(event) =>
                      setServiceConfigForm((current) => ({
                        ...current,
                        status: event.target.value as ServiceConfigStatus
                      }))
                    }
                    className="min-h-[46px] w-full appearance-none rounded-2xl border border-input bg-card px-4 pr-10 text-base text-foreground outline-none transition focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                  >
                    <option value="draft">Nháp</option>
                    <option value="active">Đang hoạt động</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t-[0.5px] border-border px-5 py-4">
              <button
                type="button"
                className="ui-hover-card inline-flex h-10 items-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition hover:border-foreground/20 hover:bg-[#fcfcfc]"
                onClick={() => setIsServiceConfigModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center rounded-full bg-[#245698] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d467d]"
                onClick={() => setIsServiceConfigModalOpen(false)}
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
