"use client";

import Image from "next/image";
import {
  BadgeDollarSign,
  Calculator,
  Bell,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Folder,
  History,
  Info,
  ListFilter,
  MessagesSquare,
  MapPin,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Route,
  Search,
  Settings2,
  UsersRound,
  ShieldPlus,
  Copy,
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
  icon: "export" | "import" | "pricing" | "operations" | "customers" | "services" | "reports" | "settings";
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
type CustomerSubPage = "list" | "contracts" | "services";
type CustomerService = "Xuất khẩu/ nhập khẩu" | "Vận chuyển/ kho bãi" | "Default pickup/ delivery location";
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

type ContractRow = {
  code: string;
  customer: string;
  contractCompany: string;
  services: CustomerService[];
  contractType: string;
  term: string;
  status: "draft" | "active" | "expired";
  signedAt: string;
};

const sidebarGroups: SidebarGroup[] = [
  {
    title: "Xuất khẩu",
    icon: "export",
    active: true
  },
  { title: "Nhập khẩu", icon: "import" },
  { title: "Module tính phí", icon: "pricing" },
  { title: "Báo cáo", icon: "reports" },
  {
    title: "Quản lý khách hàng",
    icon: "customers",
    items: [
      { label: "Danh sách khách hàng", icon: "folder" },
      { label: "Quản lý hợp đồng", icon: "description" },
      { label: "Cấu hình dịch vụ", icon: "settings" }
    ]
  },
  { title: "Cài đặt", icon: "settings" }
];

const tabs = ["Nháp", "Đang chờ xác nhận", "Đã xác nhận"];
const desktopTableColumns = "176px minmax(0, 1.45fr) minmax(180px, 1.05fr) 120px 180px 150px 120px 49px";
const customerTableColumns = "minmax(330px,1.65fr) minmax(159px,0.83fr) minmax(260px,1.25fr) 208px minmax(210px,1.05fr) 49px";
const contractTableColumns =
  "minmax(148px,1.1fr) minmax(330px,2.15fr) minmax(110px,0.72fr) minmax(260px,1.25fr) minmax(186px,0.95fr) minmax(214px,1.05fr) 49px";
const serviceConfigTableColumns =
  "minmax(260px,1.45fr) minmax(360px,2.1fr) 180px 180px 160px 49px";
const CREATE_BOOKING_CODE = "__create__";
const createQuoteOptions = ["SQ-2026-0005", "SQ-2026-0012", "SQ-2026-0018", "SQ-2026-0024"];
const bookingStatuses: BookingStatus[] = ["draft", "pending", "confirmed", "canceled"];
const bookingStatusMeta: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Nháp",
    className: "bg-[#4A4A4A] text-white"
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
    className: "bg-[#4A4A4A] text-white"
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

  if (icon === "reports") {
    return <FileText className={common} strokeWidth={1.8} />;
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
    <button className="ui-hover-card flex h-10 w-10 items-center justify-center rounded-full border-[0.5px] border-border bg-background text-foreground shadow-[0_1px_1.75px_rgba(0,0,0,0.05)] transition">
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
    className: "bg-[#4A4A4A] text-white"
  },
  active: {
    label: "Còn hiệu lực",
    className: "bg-[#0879C9] text-white"
  },
  expired: {
    label: "Hết hiệu lực",
    className: "bg-[#F33233] text-white"
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

function CustomerServiceTag({
  service
}: {
  service: "Xuất khẩu/ nhập khẩu" | "Vận chuyển/ kho bãi" | "Default pickup/ delivery location";
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
  readOnly = false
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  type?: "text" | "number" | "date";
  multiline?: boolean;
  readOnly?: boolean;
}) {
  const baseClassName =
    "min-h-[46px] w-full rounded-2xl border border-input bg-card px-4 text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]";
  const inputPlaceholder =
    type === "date"
      ? "dd/mm/yyyy"
      : type === "number"
        ? "Nhập số liệu"
        : `Nhập ${label.toLowerCase()}`;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">{label}</div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={readOnly}
          placeholder={inputPlaceholder}
          className={`${baseClassName} resize-none py-3 leading-6`}
          rows={3}
        />
      ) : options ? (
        <div className="relative">
          <select
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            disabled={readOnly}
            className={`${baseClassName} appearance-none pr-10`}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
          />
        </div>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          readOnly={readOnly}
          placeholder={inputPlaceholder}
          className={baseClassName}
        />
      )}
    </div>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs text-muted-foreground">{children}</p>;
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
  const desktopTableShellRef = useRef<HTMLDivElement | null>(null);
  const desktopTableBodyRef = useRef<HTMLDivElement | null>(null);
  const customerTableBodyRef = useRef<HTMLDivElement | null>(null);
  const contractTableBodyRef = useRef<HTMLDivElement | null>(null);
  const serviceConfigTableBodyRef = useRef<HTMLDivElement | null>(null);
  const detailsScrollRef = useRef<HTMLDivElement | null>(null);
  const detailsIntroCardRef = useRef<HTMLDivElement | null>(null);
  const bookingConfirmationInputRef = useRef<HTMLInputElement | null>(null);
  const contractScanInputRef = useRef<HTMLInputElement | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);
  const customerStatusFilterRef = useRef<HTMLDivElement | null>(null);
  const contractStatusFilterRef = useRef<HTMLDivElement | null>(null);
  const contractExpiryFilterRef = useRef<HTMLDivElement | null>(null);
  const contractExpiryFromInputRef = useRef<HTMLInputElement | null>(null);
  const contractExpiryToInputRef = useRef<HTMLInputElement | null>(null);
  const rowActionMenuRef = useRef<HTMLDivElement | null>(null);
  const customerRowActionMenuRef = useRef<HTMLDivElement | null>(null);
  const contractRowActionMenuRef = useRef<HTMLDivElement | null>(null);
  const detailsActionMenuRef = useRef<HTMLDivElement | null>(null);
  const customerCreateMenuRef = useRef<HTMLDivElement | null>(null);
  const customerSearchRef = useRef<HTMLDivElement | null>(null);
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
  const [openCustomerRowActionKey, setOpenCustomerRowActionKey] = useState<string | null>(null);
  const [openContractRowActionCode, setOpenContractRowActionCode] = useState<string | null>(null);
  const [isDetailsActionMenuOpen, setIsDetailsActionMenuOpen] = useState(false);
  const [isCustomerCreateMenuOpen, setIsCustomerCreateMenuOpen] = useState(false);
  const [isServiceConfigModalOpen, setIsServiceConfigModalOpen] = useState(false);
  const [selectedRowCodes, setSelectedRowCodes] = useState<string[]>([]);
  const [destinationOpenSignal, setDestinationOpenSignal] = useState(0);
  const [openRoutePortMenu, setOpenRoutePortMenu] = useState<"origin" | "destination" | null>(null);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerShipmentPage, setCustomerShipmentPage] = useState(1);
  const [contractScanFileName, setContractScanFileName] = useState("");
  const [contractScanFileUrl, setContractScanFileUrl] = useState("");
  const [contractScanUpdatedAt, setContractScanUpdatedAt] = useState("");
  const [recentCustomerSearches, setRecentCustomerSearches] = useState<string[]>([]);
  const [recentOriginPortSearches, setRecentOriginPortSearches] = useState<string[]>([]);
  const [recentDestinationPortSearches, setRecentDestinationPortSearches] = useState<string[]>([]);
  const [openSidebarGroups, setOpenSidebarGroups] = useState<string[]>([]);
  const [serviceConfigForm, setServiceConfigForm] = useState<ServiceConfigFormState>({
    service: "",
    description: "",
    status: "draft"
  });
  const allBookingRows = Object.values(rowsByTab).flat();
  const isCustomerPage = currentPage === "customers";
  const isCustomerListPage = currentPage === "customers" && customerSubPage === "list" && !selectedCustomerKey;
  const isCustomerContractsPage =
    currentPage === "customers" && customerSubPage === "contracts" && !selectedContractCode;
  const isCustomerServicesPage = currentPage === "customers" && customerSubPage === "services";
  const isCustomerDetailsPage = currentPage === "customers" && customerSubPage === "list" && !!selectedCustomerKey;
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
  const customerSearchOptions = sortSelectOptions(
    [...new Set(allBookingRows.map((row) => row.customer))].map((customer) => ({
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
  const customerRows = customerSearchOptions.map((option, index) => {
    const totalBookings = allBookingRows.filter((row) => row.customer === option.value).length;
    const accountStatuses: CustomerAccountStatus[] = ["draft", "active", "active", "locked"];
    const availableTags = [
      ["VIP", "Strategic"],
      ["Strategic"],
      ["Key Account"],
      ["VIP"],
      ["Growth"],
      ["Priority"]
    ];
    const availableServices = [
      ["Xuất khẩu/ nhập khẩu", "Vận chuyển/ kho bãi"],
      ["Vận chuyển/ kho bãi"],
      ["Default pickup/ delivery location"],
      ["Xuất khẩu/ nhập khẩu", "Default pickup/ delivery location"],
      ["Xuất khẩu/ nhập khẩu"],
      ["Vận chuyển/ kho bãi", "Default pickup/ delivery location"]
    ] as const;

    return {
      customer: option.value,
      taxId: `03012345${String(60 + index).padStart(2, "0")}`,
      contractCompany: index % 2 === 0 ? "PI Log" : "TDB",
      contactName: customerContactDirectory[option.value]?.contactName ?? "",
      email: customerContactDirectory[option.value]?.email ?? "",
      phone: customerContactDirectory[option.value]?.phone ?? "",
      totalBookings,
      status: accountStatuses[index % accountStatuses.length],
      customerGroup: availableTags[index % availableTags.length][0],
      services: [...availableServices[index % availableServices.length]]
    };
  });
  const contractRows: ContractRow[] = customerRows.map((row, index) => ({
    code: `HD-2026-${String(1001 + index).padStart(4, "0")}`,
    customer: row.customer,
    contractCompany: row.contractCompany,
    services: [...row.services],
    contractType: index % 3 === 0 ? "Khung năm" : index % 3 === 1 ? "Theo chuyến" : "Dịch vụ logistics",
    term: index % 3 === 1 ? "01/03/2026 - 30/09/2026" : "01/01/2026 - 31/12/2026",
    status: index % 5 === 0 ? "draft" : index % 4 === 0 ? "expired" : "active",
    signedAt: `${String(10 + (index % 18)).padStart(2, "0")}/03/2026`
  }));
  const serviceConfigRows: ServiceConfigRow[] = (
    [
      {
        service: "Xuất khẩu/ nhập khẩu",
        description: "Dịch vụ xử lý booking, chứng từ và vận hành xuất nhập khẩu.",
        status: "active" as const
      },
      {
        service: "Vận chuyển/ kho bãi",
        description: "Điều phối vận chuyển nội địa, lưu kho và bàn giao hàng hóa.",
        status: "active" as const
      },
      {
        service: "Default pickup/ delivery location",
        description: "Thiết lập địa điểm lấy và giao hàng mặc định cho từng hồ sơ.",
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
  const selectedContractRow = selectedContractCode
    ? contractRows.find((row) => row.code === selectedContractCode) ?? null
    : null;
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
  const visibleCustomerRows = customerRows.filter((row) => {
    if (
      customerListFilters.contacts.length > 0 &&
      !customerListFilters.contacts.includes(row.customer)
    ) {
      return false;
    }

    if (
      customerListFilters.companies.length > 0 &&
      !customerListFilters.companies.includes(row.contractCompany)
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

    if (contractExpiryRange.from || contractExpiryRange.to) {
      if (row.status === "draft") {
        return false;
      }

      const expiryTimestamp = parseDisplayDate(row.term.split(" - ")[1] ?? row.term);
      if (contractExpiryRange.from && expiryTimestamp < parseIsoDate(contractExpiryRange.from)) {
        return false;
      }

      if (contractExpiryRange.to && expiryTimestamp > parseIsoDate(contractExpiryRange.to)) {
        return false;
      }
    }

    return true;
  })
    .sort((left, right) => {
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
  const selectedCustomerStatusLabel = selectedCustomerRow
    ? customerAccountStatusMeta[selectedCustomerRow.status].label
    : "";
  const selectedCustomerToggleLabel =
    selectedCustomerRow?.status === "active" ? "Ngưng khách hàng" : "Kích hoạt khách hàng";
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
              : "list"
          : "list"
      );
      setSelectedCustomerKey(
        nextPage === "customers" && nextParams.get("view") !== "contracts" && nextParams.get("view") !== "services"
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
    if (!openCustomerRowActionKey) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerRowActionMenuRef.current?.contains(event.target as Node)) {
        setOpenCustomerRowActionKey(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openCustomerRowActionKey]);

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
    if (!isCustomerCreateMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!customerCreateMenuRef.current?.contains(event.target as Node)) {
        setIsCustomerCreateMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isCustomerCreateMenuOpen]);

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
    const visibleCodeSet = new Set(visibleRows.map((row) => row.code));
    setSelectedRowCodes((current) => current.filter((code) => visibleCodeSet.has(code)));
  }, [visibleRows]);

  useEffect(() => {
    setRecentCustomerSearches(customerSearchOptions.slice(0, 5).map((option) => option.value));
  }, [customerSearchOptions]);

  useEffect(() => {
    setRecentOriginPortSearches(portSearchOptions.slice(0, 5).map((option) => option.label));
    setRecentDestinationPortSearches(portSearchOptions.slice(0, 5).map((option) => option.label));
  }, [portSearchOptions]);

  const openBookingDetails = (code: string) => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("page");
    nextParams.delete("view");
    nextParams.set("booking", code);
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("bookings");
    setSelectedBookingCode(code);
  };

  const openCreateRequest = () => {
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.delete("page");
    nextParams.delete("booking");
    nextParams.set("view", "create");
    const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
    window.history.pushState({}, "", nextUrl);
    setCurrentPage("bookings");
    setSelectedBookingCode(CREATE_BOOKING_CODE);
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

  const showBookingList = () => {
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

  const showCustomerList = () => {
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

  const showCustomerContracts = () => {
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

  const showCustomerServices = () => {
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

  const openServiceConfigModal = () => {
    setServiceConfigForm({
      service: "",
      description: "",
      status: "draft"
    });
    setIsServiceConfigModalOpen(true);
  };

  const openCustomerDetails = (customer: string) => {
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

  const openContractDetails = (code: string) => {
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
  const scheduleOriginLabel = selectedBookingRow ? formatPortFilterLabel(selectedBookingRow.route.from) : "";
  const scheduleDestinationLabel = selectedBookingRow ? formatPortFilterLabel(selectedBookingRow.route.to) : "";
  const [routeScheduleForm, setRouteScheduleForm] = useState({
    originPort: isCreatePage ? "" : scheduleOriginLabel,
    originLocationType: defaultLocationOption,
    destinationPort: isCreatePage ? "" : scheduleDestinationLabel,
    destinationLocationType: defaultLocationOption,
    vesselName: isCreatePage ? "" : selectedVesselName,
    voyage: isCreatePage ? "" : selectedVoyage,
    etd: "2026-03-15",
    eta: "2026-03-22"
  });
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
  const [carrierInteractionForm, setCarrierInteractionForm] = useState({
    carrier: selectedCarrier,
    carrierBookingNo: "",
    bookingConfirmationFileName: ""
  });
  const [generalInfoForm, setGeneralInfoForm] = useState({
    customer: "",
    linkedQuote: "",
    estimatedRate: "",
    contactName: "",
    email: "",
    phone: ""
  });
  const [valueAddedServicesForm, setValueAddedServicesForm] = useState({
    inlandTransport: false,
    customsServices: [] as string[],
    valueProtect: [] as string[]
  });
  const normalizedCustomerQuery = generalInfoForm.customer.trim().toLowerCase();
  const recentCustomerOptions = recentCustomerSearches
    .map((value) => customerSearchOptions.find((option) => option.value === value))
    .filter((option): option is SelectOption => Boolean(option));
  const customerDropdownOptions =
    normalizedCustomerQuery.length >= 3
      ? customerSearchOptions.filter((option) => option.label.toLowerCase().includes(normalizedCustomerQuery))
      : recentCustomerOptions;
  const [internalNotes, setInternalNotes] = useState("");
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
      <div className="flex h-screen w-full flex-col overflow-visible bg-background pt-14">
        <header className="fixed left-0 right-0 top-0 z-30 h-14 w-full overflow-visible border-b-[0.5px] border-border bg-background">
          <div className="grid h-full w-full grid-cols-[auto_1fr_auto] items-center gap-3 overflow-visible px-4 md:px-6 lg:grid-cols-[240px_minmax(0,1fr)_auto] lg:px-0">
            <div className="flex h-full min-w-0 items-center lg:px-6">
              <SidebarLogo onClick={showBookingList} />
            </div>

            <div className="hidden h-full min-w-0 items-center md:flex lg:px-6">
              <div className="w-full min-w-0 max-w-[520px] justify-self-center">
                <label className="flex h-10 w-full items-center gap-2 rounded-full border-[0.5px] border-input bg-card px-3 text-base text-muted-foreground shadow-subtle">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm kiếm đơn hàng, khách hàng, hợp đồng..."
                    className="w-full min-w-0 border-0 bg-transparent p-0 text-base text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <span className="h-5 w-px shrink-0 bg-border" />
                  <button
                    type="button"
                    className="ui-hover-card -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors"
                  >
                    <Filter className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                </label>
              </div>
            </div>

            <div className="flex h-full min-w-0 items-center justify-end gap-2 md:gap-3 lg:px-6">
              <HeaderIconButton>
                <MessagesSquare className="h-5 w-5" strokeWidth={1.8} />
              </HeaderIconButton>
              <HeaderIconButton>
                <History className="h-5 w-5" strokeWidth={1.8} />
              </HeaderIconButton>
              <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
                <button
                  type="button"
                  className="ui-hover-card flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D7D9D3] text-sm font-medium text-foreground transition"
                >
                  AP
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-start overflow-hidden">
          <div className="hidden w-[240px] shrink-0 lg:block" aria-hidden="true" />

          <aside className="fixed left-0 top-14 hidden h-[calc(100vh-56px)] w-[240px] overflow-y-auto bg-sidebar lg:block">
            <div className="px-4 py-2">
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
                              ((item.label === "Danh sách khách hàng" && (isCustomerListPage || isCustomerDetailsPage)) ||
                                (item.label === "Quản lý hợp đồng" && (isCustomerContractsPage || isContractDetailsPage)) ||
                                (item.label === "Cấu hình dịch vụ" && isCustomerServicesPage))
                                ? "bg-card text-[#18181b]"
                                : "ui-hover-bg text-foreground"
                            }`}
                            onClick={
                              isCustomersGroup && item.label === "Danh sách khách hàng"
                                ? showCustomerList
                                : isCustomersGroup && item.label === "Quản lý hợp đồng"
                                  ? showCustomerContracts
                                  : isCustomersGroup && item.label === "Cấu hình dịch vụ"
                                    ? showCustomerServices
                                : undefined
                            }
                          >
                            <span
                              className={`h-[2px] w-[2px] rounded-full ${
                                isCustomersGroup &&
                                ((item.label === "Danh sách khách hàng" && (isCustomerListPage || isCustomerDetailsPage)) ||
                                  (item.label === "Quản lý hợp đồng" && (isCustomerContractsPage || isContractDetailsPage)) ||
                                  (item.label === "Cấu hình dịch vụ" && isCustomerServicesPage))
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
          </aside>

          <section className="flex h-[calc(100vh-56px)] flex-1 flex-col overflow-hidden bg-background p-4 md:p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex w-fit max-w-full flex-col gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5 text-[22px] font-medium leading-[1.25] text-foreground">
                  <span>{isCustomerPage ? "Quản lý khách hàng" : "Xuất khẩu"}</span>
                  <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
                  {isCustomerPage ? (
                    isCustomerListPage ? (
                      <span>Danh sách khách hàng</span>
                    ) : isCustomerContractsPage ? (
                      <span>Quản lý hợp đồng</span>
                    ) : isCustomerServicesPage ? (
                      <span>Cấu hình dịch vụ</span>
                    ) : isContractDetailsPage ? (
                      <button
                        className="text-left text-foreground transition-colors hover:text-muted-foreground"
                        onClick={showCustomerContracts}
                      >
                        Quản lý hợp đồng
                      </button>
                    ) : (
                      <button
                        className="text-left text-foreground transition-colors hover:text-muted-foreground"
                        onClick={showCustomerList}
                      >
                        Danh sách khách hàng
                      </button>
                    )
                  ) : selectedBookingCode ? (
                    isCreatePage ? null : (
                      <button
                        className="text-left text-foreground transition-colors hover:text-muted-foreground"
                        onClick={showBookingList}
                      >
                        Danh sách yêu cầu Booking
                      </button>
                    )
                  ) : (
                    <span>Danh sách yêu cầu Booking</span>
                  )}
                  {isCustomerDetailsPage && selectedCustomerRow ? (
                    <>
                      <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
                      <span>
                        {selectedCustomerRow.customer.length > 30
                          ? `${selectedCustomerRow.customer.slice(0, 27)}...`
                          : selectedCustomerRow.customer}
                      </span>
                      <div ref={detailsActionMenuRef} className="relative flex items-center self-center">
                        <button
                          type="button"
                          aria-label="Tác vụ khách hàng"
                          className="flex h-4 w-4 items-center justify-center rounded-md text-foreground transition-colors hover:bg-[#F7F7F5]"
                          onClick={() => setIsDetailsActionMenuOpen((current) => !current)}
                        >
                          <DesignDownArrowIcon className="h-3 w-3" />
                        </button>

                        {isDetailsActionMenuOpen ? (
                          <div className="absolute right-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                            {[
                              { label: "Xem chi tiết", icon: Eye, onClick: () => setIsDetailsActionMenuOpen(false) },
                              { label: "Chỉnh sửa", icon: Pencil, onClick: () => setIsDetailsActionMenuOpen(false) },
                              { label: "Xóa", icon: Trash2, onClick: () => setIsDetailsActionMenuOpen(false) }
                            ].map((item, itemIndex) => (
                              <button
                                key={item.label}
                                type="button"
                                className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                  itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                }`}
                                onClick={item.onClick}
                              >
                                <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  {isContractDetailsPage && selectedContractRow ? (
                    <>
                      <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
                      <span>{selectedContractRow.code}</span>
                      <div ref={detailsActionMenuRef} className="relative flex items-center self-center">
                        <button
                          type="button"
                          aria-label="Tác vụ hợp đồng"
                          className="flex h-4 w-4 items-center justify-center rounded-md text-foreground transition-colors hover:bg-[#F7F7F5]"
                          onClick={() => setIsDetailsActionMenuOpen((current) => !current)}
                        >
                          <DesignDownArrowIcon className="h-3 w-3" />
                        </button>

                        {isDetailsActionMenuOpen ? (
                          <div className="absolute right-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                            {[
                              { label: "Xem chi tiết", icon: Eye, onClick: () => setIsDetailsActionMenuOpen(false) },
                              { label: "Chỉnh sửa", icon: Pencil, onClick: () => setIsDetailsActionMenuOpen(false) },
                              { label: "Xóa", icon: Trash2, onClick: () => setIsDetailsActionMenuOpen(false) }
                            ].map((item, itemIndex) => (
                              <button
                                key={item.label}
                                type="button"
                                className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                  itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                }`}
                                onClick={item.onClick}
                              >
                                <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                  {selectedBookingCode ? (
                    <>
                      {isCreatePage ? null : <ChevronRight className="h-5 w-5" strokeWidth={1.8} />}
                      <span>{isCreatePage ? "Tạo yêu cầu mới" : selectedBookingCode}</span>
                      {selectedBookingRow && !isCreatePage ? (
                        <div ref={detailsActionMenuRef} className="relative flex items-center self-center">
                          <button
                            type="button"
                            aria-label="Tác vụ booking"
                            className="flex h-4 w-4 items-center justify-center rounded-md text-foreground transition-colors hover:bg-[#F7F7F5]"
                            onClick={() => setIsDetailsActionMenuOpen((current) => !current)}
                          >
                            <DesignDownArrowIcon className="h-3 w-3" />
                          </button>

                          {isDetailsActionMenuOpen ? (
                            <div className="absolute right-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                              {[
                                {
                                  label: "Chỉnh sửa",
                                  icon: Pencil,
                                  onClick: () => setIsDetailsActionMenuOpen(false)
                                },
                                {
                                  label: "Nhân bản",
                                  icon: Copy,
                                  onClick: () => setIsDetailsActionMenuOpen(false)
                                },
                                {
                                  label: "Tải xuống",
                                  icon: Download,
                                  onClick: () => setIsDetailsActionMenuOpen(false)
                                },
                                {
                                  label: "Xóa",
                                  icon: Trash2,
                                  onClick: () => setIsDetailsActionMenuOpen(false)
                                }
                              ].map((item, itemIndex) => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                        itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                      }`}
                                      onClick={item.onClick}
                                    >
                                      <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                      <span>{item.label}</span>
                                    </button>
                                  ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
                {isBookingListPage || isCustomerListPage || isCustomerContractsPage || isCustomerServicesPage ? (
                  <div className="md:hidden">
                  <label className="flex h-10 w-full items-center gap-2 rounded-full border-[0.5px] border-input bg-card px-3 text-base text-muted-foreground shadow-subtle">
                    <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={
                        isCustomerPage
                          ? "Tìm kiếm đơn hàng, khách hàng, hợp đồng..."
                          : "Tìm kiếm đơn hàng, khách hàng, hợp đồng..."
                      }
                      className="w-full border-0 bg-transparent p-0 text-base text-foreground placeholder:text-muted-foreground outline-none"
                    />
                  </label>
                  </div>
                ) : null}
              </div>

              {isBookingListPage || isCustomerListPage || isCustomerContractsPage || isCustomerServicesPage ? (
                <div className="shrink-0 lg:ml-auto lg:flex lg:flex-col lg:items-end lg:gap-4">
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {isCustomerPage ? (
                      <div ref={customerCreateMenuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            if (isCustomerServicesPage) {
                              openServiceConfigModal();
                              return;
                            }

                            setIsCustomerCreateMenuOpen((current) => !current);
                          }}
                          className="ui-hover-card inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground shadow-[0_1px_1.75px_rgba(0,0,0,0.05)] transition hover:border-foreground/20 hover:bg-[#fcfcfc]"
                        >
                          <Plus className="h-5 w-5" strokeWidth={1.8} />
                          <span>Thêm mới</span>
                        </button>

                        {isCustomerCreateMenuOpen && !isCustomerServicesPage ? (
                          <div className="absolute right-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                            {[
                              { label: "Thêm thủ công", icon: Plus },
                              { label: "Import file Excel/CSV", icon: Upload }
                            ].map((item, itemIndex) => (
                              <button
                                key={item.label}
                                type="button"
                                className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                  itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                }`}
                                onClick={() => setIsCustomerCreateMenuOpen(false)}
                              >
                                <item.icon className="h-5 w-5 text-foreground" strokeWidth={1.8} />
                                <span>{item.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openCreateRequest}
                        className="ui-hover-card inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground shadow-[0_1px_1.75px_rgba(0,0,0,0.05)] transition hover:border-foreground/20 hover:bg-[#fcfcfc]"
                      >
                        <Plus className="h-5 w-5" strokeWidth={1.8} />
                        <span>Tạo yêu cầu mới</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {isCustomerDetailsPage && selectedCustomerRow ? (
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
                            <div className="text-base font-medium text-muted-foreground">Loại dịch vụ</div>
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              {selectedContractRow.services.map((service) => (
                                <CustomerServiceTag key={`${selectedContractRow.code}-${service}`} service={service} />
                              ))}
                            </div>
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
                            <div className="text-base text-foreground">{selectedContractExpiry}</div>
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
              <div ref={detailsScrollRef} className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
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
                <div className="mt-1 shrink-0 flex flex-wrap items-start gap-2">
                  {resolvedAdvancedFilterConfigs.map((filter) => (
                    <AdvancedMultiSelectFilter
                      key={filter.key}
                      label={filter.label}
                      placeholder={filter.placeholder}
                      searchPlaceholder={filter.searchPlaceholder}
                      options={filter.options}
                      selectedValues={advancedFilters[filter.key]}
                      onChange={(values) => updateAdvancedFilter(filter.key, values)}
                      align="left"
                      searchable={
                        filter.key === "customers" ||
                        filter.key === "originPorts" ||
                        filter.key === "destinationPorts"
                      }
                      immediateSingleChoice={
                        filter.key === "cargoTypes" || filter.key === "packaging"
                      }
                      openSignal={filter.key === "destinationPorts" ? destinationOpenSignal : 0}
                      onApplied={filter.key === "originPorts" ? handleOriginPortsApplied : undefined}
                    />
                  ))}
                  {totalSelectedFilters > 0 ? (
                    <button
                      type="button"
                      onClick={clearAllAdvancedFilters}
                      className="ui-hover-soft h-[34px] rounded-full bg-[#f7f7f7] px-3 text-sm font-semibold text-foreground transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  ) : null}
                </div>

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
                    {visibleRows.length > 0 ? (
                      visibleRows.map((row, index) => (
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
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
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
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.customer}
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            <RouteCell {...row.route} />
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.cargoType}
                          </div>
                          <div
                            className={`ui-hover-row-cell flex h-12 w-full items-center justify-start px-3 text-left text-sm text-foreground transition-colors ${selectedRowClass} ${
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.packaging}
                          </div>
                          <div
                            className={`ui-hover-row-cell h-12 px-3 text-left text-sm text-foreground flex items-center justify-start transition-colors ${selectedRowClass} ${
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            <BookingStatusTag status={row.status} />
                          </div>
                          <div
                            className={`ui-hover-row-cell h-12 px-3 text-left text-sm text-foreground flex items-center justify-start transition-colors ${selectedRowClass} ${
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                          >
                            {row.createdAt}
                          </div>
                          <div
                            className={`ui-hover-row-cell h-12 px-3 text-center flex items-center justify-center transition-colors ${selectedRowClass} ${
                              index === visibleRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
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
                    {visibleRows.length > 0 ? (
                      visibleRows.map((row) => (
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
                <div className="flex flex-wrap items-center gap-2">
                  {customerListFilterConfigs.map((filter) => (
                    <AdvancedMultiSelectFilter
                      key={filter.key}
                      label={filter.label}
                      placeholder={filter.placeholder}
                      searchPlaceholder={filter.searchPlaceholder}
                      options={filter.options}
                      selectedValues={customerListFilters[filter.key]}
                      onChange={(values) => updateCustomerListFilter(filter.key, values)}
                      align="left"
                      searchable={filter.key === "contacts" || filter.key === "companies"}
                      immediateSingleChoice={false}
                      compactModal={filter.key === "groups"}
                      modalWidthClass={
                        filter.key === "services" ? "w-[247px]" : undefined
                      }
                    />
                  ))}
                  <div className="flex items-center">
                    {totalSelectedCustomerListFilters > 0 ? (
                      <button
                        type="button"
                        onClick={clearAllCustomerListFilters}
                        className="ui-hover-soft h-[34px] rounded-full bg-[#f7f7f7] px-3 text-sm font-semibold text-foreground transition-colors"
                      >
                        Xóa tất cả
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col"
                >
                  <div
                    className="grid shrink-0 border-b border-border bg-card"
                    style={{
                      gridTemplateColumns: customerTableColumns,
                      paddingRight: customerTableScrollbarWidth ? `${customerTableScrollbarWidth}px` : undefined
                    }}
                  >
                    {["Khách hàng", "Công ty", "Dịch vụ đang sử dụng", "Trạng thái", "Nhóm khách hàng", ""].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`flex h-11 w-full min-w-0 items-center justify-start text-left text-sm font-normal text-muted-foreground ${
                          index === 0 ? "pl-6 pr-9" : "px-4"
                        }`}
                      >
                        {label === "Trạng thái" ? (
                          <div ref={customerStatusFilterRef} className="relative flex items-center gap-1.5">
                            <span>{label}</span>
                            <button
                              type="button"
                              className={`rounded-md p-1 transition-colors ${
                                isCustomerStatusFilterOpen || customerStatusFilters.length > 0
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                              onClick={openCustomerStatusFilter}
                            >
                              <ListFilter className="h-4 w-4" strokeWidth={1.8} />
                            </button>

                            {isCustomerStatusFilterOpen ? (
                              <div className="absolute left-0 top-full z-20 mt-1 w-[220px] overflow-hidden rounded-[12px] border border-[#e7e6e9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                <div className="max-h-[220px] overflow-y-auto py-2">
                                  <button
                                    type="button"
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                                      customerStatusFilters.length === 0 ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                    onClick={selectAllCustomerStatuses}
                                  >
                                    <span>{customerStatusFilterAllOption.label}</span>
                                    {customerStatusFilters.length === 0 ? (
                                      <Check className="h-4 w-4 text-foreground" strokeWidth={2} />
                                    ) : null}
                                  </button>
                                  {customerStatusFilterOptions.map((option) => {
                                    const isSelected = customerStatusFilters[0] === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                                          isSelected ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                        onClick={() => toggleCustomerStatusFilterValue(option.value)}
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

                  <div ref={customerTableBodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                    {visibleCustomerRows.length > 0 ? (
                      visibleCustomerRows.map((row, index) => (
                        <div
                          key={row.customer}
                          className="grid cursor-pointer bg-card transition-colors hover:bg-[#B6E1FF]"
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
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start pl-6 pr-9 text-left text-sm font-semibold text-foreground ${index === visibleCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.customer}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.contractCompany}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 flex-nowrap items-center justify-start gap-2 overflow-hidden px-4 text-left text-sm text-foreground ${index === visibleCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.services[0] ? (
                              <CustomerServiceTag key={`${row.customer}-${row.services[0]}`} service={row.services[0]} />
                            ) : null}
                            {row.services.length > 1 ? (
                              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2 py-1 text-xs font-medium text-foreground">
                                {`${row.services.length - 1}+`}
                              </span>
                            ) : null}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <CustomerAccountStatusTag status={row.status} />
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.customerGroup}
                          </div>
                          <div className={`flex h-12 items-center justify-center px-3 ${index === visibleCustomerRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <div
                              ref={openCustomerRowActionKey === row.customer ? customerRowActionMenuRef : undefined}
                              className="relative"
                            >
                              <button
                                type="button"
                                aria-label={`Tác vụ cho ${row.customer}`}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenCustomerRowActionKey((current) =>
                                    current === row.customer ? null : row.customer
                                  );
                                }}
                              >
                                <MoreVertical className="h-4 w-4" strokeWidth={1.8} />
                              </button>

                              {openCustomerRowActionKey === row.customer ? (
                                <div className="absolute right-0 top-full z-20 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                  {[
                                    { label: "Xem chi tiết", icon: Eye, onClick: () => openCustomerDetails(row.customer) },
                                    { label: "Chỉnh sửa", icon: Pencil },
                                    { label: "Xóa", icon: Trash2 }
                                  ].map((item, itemIndex) => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                        itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                      }`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenCustomerRowActionKey(null);
                                        item.onClick?.();
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
                    {visibleCustomerRows.length > 0 ? (
                      visibleCustomerRows.map((row) => (
                        <article
                          key={row.customer}
                          className="rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-[#B6E1FF]"
                        >
                          <div className="text-sm font-semibold text-foreground">{row.customer}</div>
                          <div className="mt-3 space-y-2 text-sm text-foreground">
                            <div>
                              <span className="text-muted-foreground">Công ty ký hợp đồng: </span>
                              {row.contractCompany}
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
                              <span className="text-muted-foreground">Dịch vụ đang sử dụng: </span>
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

            {isCustomerContractsPage ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <AdvancedMultiSelectFilter
                    label="Khách hàng"
                    placeholder="Chọn khách hàng"
                    searchPlaceholder="Tìm theo tên khách hàng hoặc MST"
                    options={sortSelectOptions(
                      contractRows.map((row) => ({
                        label: row.customer,
                        value: row.customer,
                        searchText: `${row.customer} ${customerRows.find((customer) => customer.customer === row.customer)?.taxId ?? ""}`
                      }))
                    )}
                    selectedValues={customerListFilters.contacts}
                    onChange={(values) => updateCustomerListFilter("contacts", values)}
                    align="left"
                    searchable
                  />
                  <AdvancedMultiSelectFilter
                    label="Công ty ký hợp đồng"
                    placeholder="Chọn công ty ký hợp đồng"
                    searchPlaceholder="Tìm theo công ty ký hợp đồng"
                    options={sortSelectOptions(
                      [...new Set(contractRows.map((row) => row.contractCompany))].map((company) => ({
                        label: company,
                        value: company
                      }))
                    )}
                    selectedValues={customerListFilters.companies}
                    onChange={(values) => updateCustomerListFilter("companies", values)}
                    align="left"
                    searchable
                  />
                  <AdvancedMultiSelectFilter
                    label="Dịch vụ"
                    placeholder="Chọn dịch vụ"
                    searchPlaceholder="Tìm theo dịch vụ"
                    options={sortSelectOptions(
                      [...new Set(contractRows.flatMap((row) => row.services))].map((service) => ({
                        label: service,
                        value: service
                      }))
                    )}
                    selectedValues={customerListFilters.services}
                    onChange={(values) => updateCustomerListFilter("services", values)}
                    align="left"
                    immediateSingleChoice={false}
                    modalWidthClass="w-[247px]"
                    searchable={false}
                  />
                  <div ref={contractExpiryFilterRef} className="relative">
                    <button
                      type="button"
                      className={`ui-hover-soft inline-flex h-[34px] max-w-full items-center justify-between gap-2 rounded-full border-[0.5px] bg-card px-3 text-left text-sm text-foreground transition-colors ${
                        isContractExpiryFilterOpen || contractExpiryRange.from || contractExpiryRange.to
                          ? "border-[#18181b]"
                          : "border-[#cbccc9]"
                      }`}
                      onClick={() => setIsContractExpiryFilterOpen((current) => !current)}
                    >
                      <span className="truncate">
                        {contractExpiryRange.from || contractExpiryRange.to
                          ? `${contractExpiryRange.from ? formatIsoDateToDisplay(contractExpiryRange.from) : "Từ ngày"} - ${
                              contractExpiryRange.to ? formatIsoDateToDisplay(contractExpiryRange.to) : "Đến ngày"
                            }`
                          : "Ngày hết hạn"}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                          isContractExpiryFilterOpen ? "rotate-180" : ""
                        }`}
                        strokeWidth={1.8}
                      />
                    </button>

                    {isContractExpiryFilterOpen ? (
                      <div className="absolute left-0 top-full z-40 mt-1 w-[320px] max-w-[calc(100vw-32px)] rounded-[16px] bg-card shadow-[inset_0_0_0_0.5px_#E7E6E9,0_24px_62px_rgba(17,17,17,0.22)]">
                        <div className="space-y-4 px-4 py-4">
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Từ ngày</div>
                            <input
                              ref={contractExpiryFromInputRef}
                              type="date"
                              value={draftContractExpiryRange.from}
                              onClick={() => contractExpiryFromInputRef.current?.showPicker?.()}
                              onFocus={() => contractExpiryFromInputRef.current?.showPicker?.()}
                              onKeyDown={(event) => event.preventDefault()}
                              onChange={(event) =>
                                setDraftContractExpiryRange((current) => ({
                                  ...current,
                                  from: event.target.value
                                }))
                              }
                              className="min-h-[42px] w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Đến ngày</div>
                            <input
                              ref={contractExpiryToInputRef}
                              type="date"
                              value={draftContractExpiryRange.to}
                              onClick={() => contractExpiryToInputRef.current?.showPicker?.()}
                              onFocus={() => contractExpiryToInputRef.current?.showPicker?.()}
                              onKeyDown={(event) => event.preventDefault()}
                              onChange={(event) =>
                                setDraftContractExpiryRange((current) => ({
                                  ...current,
                                  to: event.target.value
                                }))
                              }
                              className="min-h-[42px] w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-[var(--sidebar-accent-foreground)] focus:shadow-[0_0_0_3px_rgba(36,86,152,0.12)]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t-[0.5px] border-[#18181b] px-4 py-4">
                          <button
                            type="button"
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => setDraftContractExpiryRange({ from: "", to: "" })}
                            disabled={!draftContractExpiryRange.from && !draftContractExpiryRange.to}
                          >
                            Xóa bộ lọc
                          </button>
                          <div className="flex items-center gap-5">
                            <button
                              type="button"
                              className="text-sm font-medium text-[#22579B] transition-colors hover:text-[#1b467d]"
                              onClick={() => {
                                setDraftContractExpiryRange(
                                  contractExpiryRange.from || contractExpiryRange.to
                                    ? contractExpiryRange
                                    : getCurrentYearDateRange()
                                );
                                setIsContractExpiryFilterOpen(false);
                              }}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              className="text-sm font-medium text-[#22579B] transition-colors hover:text-[#1b467d] disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => {
                                setContractExpiryRange(draftContractExpiryRange);
                                setIsContractExpiryFilterOpen(false);
                              }}
                              disabled={
                                draftContractExpiryRange.from === contractExpiryRange.from &&
                                draftContractExpiryRange.to === contractExpiryRange.to
                              }
                            >
                              Áp dụng
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center">
                    {totalSelectedCustomerListFilters > 0 ? (
                      <button
                        type="button"
                        onClick={clearAllCustomerListFilters}
                        className="ui-hover-soft h-[34px] rounded-full bg-[#f7f7f7] px-3 text-sm font-semibold text-foreground transition-colors"
                      >
                        Xóa tất cả
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-[12px] hidden min-h-0 flex-1 overflow-hidden rounded-[12px] bg-background lg:flex lg:flex-col">
                  <div
                    className="grid shrink-0 border-b border-border bg-card"
                    style={{
                      gridTemplateColumns: contractTableColumns,
                      paddingRight: contractTableScrollbarWidth ? `${contractTableScrollbarWidth}px` : undefined
                    }}
                  >
                    {["Mã hợp đồng", "Khách hàng", "Công ty", "Loại dịch vụ", "Ngày hết hạn", "Trạng thái", ""].map((label, index) => (
                      <div
                        key={`${label}-${index}`}
                        className={`flex h-11 w-full min-w-0 items-center justify-start text-left text-sm font-normal text-muted-foreground ${
                          index === 0 ? "pl-6 pr-4" : index === 6 ? "sticky right-0 z-20 bg-card px-3" : "px-4"
                        }`}
                      >
                        {label === "Trạng thái" ? (
                          <div ref={contractStatusFilterRef} className="relative flex items-center gap-1.5">
                            <span>{label}</span>
                            <button
                              type="button"
                              className={`rounded-md p-1 transition-colors ${
                                isContractStatusFilterOpen || contractStatusFilters.length > 0
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                              onClick={openContractStatusFilter}
                            >
                              <ListFilter className="h-4 w-4" strokeWidth={1.8} />
                            </button>

                            {isContractStatusFilterOpen ? (
                              <div className="absolute left-0 top-full z-20 mt-1 w-[220px] overflow-hidden rounded-[12px] border border-[#e7e6e9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                <div className="max-h-[220px] overflow-y-auto py-2">
                                  <button
                                    type="button"
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                                      contractStatusFilters.length === 0 ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                    onClick={selectAllContractStatuses}
                                  >
                                    <span>{contractStatusFilterAllOption.label}</span>
                                    {contractStatusFilters.length === 0 ? (
                                      <Check className="h-4 w-4 text-foreground" strokeWidth={2} />
                                    ) : null}
                                  </button>
                                  {contractStatusFilterOptions.map((option) => {
                                    const isSelected = contractStatusFilters[0] === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar ${
                                          isSelected ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                        onClick={() => toggleContractStatusFilterValue(option.value)}
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

                  <div ref={contractTableBodyRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                    {visibleContractRows.length > 0 ? (
                      visibleContractRows.map((row, index, filteredRows) => (
                          <div
                            key={row.code}
                            className={`group grid cursor-pointer bg-card transition-colors hover:bg-[#B6E1FF] ${
                              index === filteredRows.length - 1 ? "" : "border-b border-[#cbcbcb]"
                            }`}
                            style={{
                              gridTemplateColumns:
                                contractTableColumns
                            }}
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
                            <div className="flex h-12 items-center justify-start pl-6 pr-4 text-left text-sm font-semibold text-foreground">
                              {row.code}
                            </div>
                            <div className="flex h-12 items-center justify-start px-4 text-left text-sm text-foreground">
                              {row.customer}
                            </div>
                            <div className="flex h-12 items-center justify-start whitespace-nowrap px-4 text-left text-sm text-foreground">
                              {row.contractCompany}
                            </div>
                            <div className="flex h-12 min-w-0 flex-nowrap items-center justify-start gap-2 overflow-hidden px-4 text-left text-sm text-foreground">
                              {row.services[0] ? (
                                <CustomerServiceTag key={`${row.code}-${row.services[0]}`} service={row.services[0]} />
                              ) : null}
                              {row.services.length > 1 ? (
                                <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2 py-1 text-xs font-medium text-foreground">
                                  {`${row.services.length - 1}+`}
                                </span>
                              ) : null}
                            </div>
                            <div className="flex h-12 items-center justify-start px-4 text-left text-sm text-foreground">
                              {row.status === "draft" ? "-" : row.term.split(" - ")[1] ?? row.term}
                            </div>
                            <div className="flex h-12 items-center justify-start px-4 text-left text-sm text-foreground">
                              <ContractStatusTag status={row.status} />
                            </div>
                            <div
                              className={`sticky right-0 flex h-12 items-center justify-center bg-card px-3 transition-colors group-hover:bg-[#B6E1FF] ${
                                openContractRowActionCode === row.code ? "z-30" : "z-10"
                              }`}
                            >
                              <div
                                ref={openContractRowActionCode === row.code ? contractRowActionMenuRef : undefined}
                                className="relative z-30"
                              >
                                <button
                                  type="button"
                                  aria-label={`Tác vụ cho ${row.code}`}
                                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[#F7F7F5] hover:text-foreground"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenContractRowActionCode((current) =>
                                      current === row.code ? null : row.code
                                    );
                                  }}
                                >
                                  <MoreVertical className="h-4 w-4" strokeWidth={1.8} />
                                </button>

                                {openContractRowActionCode === row.code ? (
                                  <div className="absolute right-0 top-full z-40 mt-1 w-[288px] overflow-hidden rounded-[12px] border border-[#E7E6E9] bg-card shadow-[0_18px_40px_rgba(17,17,17,0.16)]">
                                    {[
                                      { label: "Xem chi tiết", icon: Eye, onClick: () => openContractDetails(row.code) },
                                      { label: "Chỉnh sửa", icon: Pencil },
                                      { label: "Xóa", icon: Trash2 }
                                    ].map((item, itemIndex) => (
                                      <button
                                        key={item.label}
                                        type="button"
                                        className={`flex w-full items-center gap-4 px-4 py-3 text-left text-base text-foreground transition-colors hover:bg-sidebar ${
                                          itemIndex === 0 ? "" : "border-t border-[#E7E6E9]"
                                        }`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setOpenContractRowActionCode(null);
                                          item.onClick?.();
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
                    {contractRows.map((row) => (
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
                          <div><span className="text-muted-foreground">Khách hàng: </span>{row.customer}</div>
                          <div><span className="text-muted-foreground">Công ty ký hợp đồng: </span>{row.contractCompany}</div>
                          <div className="flex flex-nowrap items-center gap-2 overflow-hidden">
                            <span className="text-muted-foreground">Loại dịch vụ: </span>
                            {row.services[0] ? (
                              <CustomerServiceTag key={`${row.code}-${row.services[0]}`} service={row.services[0]} />
                            ) : null}
                            {row.services.length > 1 ? (
                              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[#F2F4F7] px-2 py-1 text-xs font-medium text-foreground">
                                {`${row.services.length - 1}+`}
                              </span>
                            ) : null}
                          </div>
                          <div><span className="text-muted-foreground">Ngày hết hạn: </span>{row.status === "draft" ? "-" : row.term.split(" - ")[1] ?? row.term}</div>
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
                    {visibleServiceConfigRows.length > 0 ? (
                      visibleServiceConfigRows.map((row, index) => (
                        <div
                          key={row.service}
                          className="grid bg-card transition-colors hover:bg-[#B6E1FF]"
                          style={{ gridTemplateColumns: serviceConfigTableColumns }}
                        >
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start pl-6 pr-4 text-left text-sm font-semibold text-foreground ${index === visibleServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.service}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.description}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.customerCount}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            {row.contractCount}
                          </div>
                          <div className={`flex h-12 w-full min-w-0 items-center justify-start px-4 text-left text-sm text-foreground ${index === visibleServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
                            <CustomerAccountStatusTag status={row.status} />
                          </div>
                          <div className={`flex h-12 items-center justify-center px-3 ${index === visibleServiceConfigRows.length - 1 ? "" : "border-b border-[#cbcbcb]"}`}>
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
                    {visibleServiceConfigRows.length > 0 ? (
                      visibleServiceConfigRows.map((row) => (
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
    </main>
  );
}
