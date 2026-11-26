export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: "cliente" | "admin";
  balance: number;
  is_blocked: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  sku: string | null;
  delivery_type: "manual" | "automatic";
  delivery_instructions: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_offer: boolean;
  is_new: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  cta_label: string | null;
  position: "home" | "category" | "popup";
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  product: Product;
};

export type OrderStatus =
  | "pendiente"
  | "pagado"
  | "en_proceso"
  | "entregado"
  | "cancelado"
  | "rechazado";

export type PaymentStatus = "pendiente" | "en_revision" | "aprobado" | "rechazado" | "reembolsado";

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: "saldo" | "transferencia" | "deposito" | "otro";
  delivery_type: "manual" | "automatic";
  contact: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  paid_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  delivery_type: "manual" | "automatic";
  delivery_data: string | null;
  delivered_at: string | null;
};

export type Payment = {
  id: string;
  order_id: string;
  user_id: string | null;
  amount: number;
  method: string;
  reference: string | null;
  proof_url: string | null;
  status: "pendiente" | "en_revision" | "aprobado" | "rechazado";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
};

export type WalletTransaction = {
  id: string;
  user_id: string;
  type: "credito" | "debito" | "ajuste";
  amount: number;
  balance_after: number;
  description: string | null;
  order_id: string | null;
  admin_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string | null;
  subject: string;
  message: string;
  order_id: string | null;
  status: "abierto" | "en_proceso" | "cerrado";
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export type AdminLog = {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type StoreSettings = {
  name: string;
  tagline: string;
  currency: string;
  whatsapp: string;
  support_email: string;
  payment_instructions: string;
};

export type MaintenanceSettings = {
  enabled: boolean;
  message: string;
  image_url: string;
  estimated_date: string;
};

export type Backup = {
  id: string;
  name: string;
  created_by: string | null;
  created_by_email: string | null;
  size_bytes: number;
  records_count: number;
  tables_included: string[];
  manifest: Record<string, unknown>;
  checksum: string | null;
  status: "completado" | "fallido";
  error: string | null;
  created_at: string;
};

export type BackupEvent = {
  id: string;
  backup_id: string | null;
  backup_name: string | null;
  action: "crear" | "descargar" | "restaurar" | "eliminar" | "fallo";
  status: "ok" | "error";
  message: string | null;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};
