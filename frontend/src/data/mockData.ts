export interface ShoppingItem {
  id: string;
  name: string;
  price: number | null;
  category: string;
  categoryEmoji: string;
  categoryColor: string;
  checked: boolean;
}

export const BUDGET = 4000;

// Legacy formatter kept as a fallback. Prefer formatCurrency from utils/currency.
export const formatINR = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const personalItems: ShoppingItem[] = [
  { id: '1', name: 'Amul Full Cream Milk', price: 68, category: 'Dairy', categoryEmoji: '🥛', categoryColor: '#DBEAFE', checked: false },
  { id: '2', name: 'Aashirvaad Atta 5kg', price: 245, category: 'Grains', categoryEmoji: '🌾', categoryColor: '#FEF3C7', checked: false },
  { id: '3', name: 'Toor Dal 1kg', price: 165, category: 'Pulses', categoryEmoji: '🫘', categoryColor: '#EDE9FE', checked: true },
  { id: '4', name: 'Tomatoes 500g', price: 32, category: 'Vegetables', categoryEmoji: '🍅', categoryColor: '#D1FAE5', checked: false },
  { id: '5', name: 'Onions 1kg', price: 48, category: 'Vegetables', categoryEmoji: '🧅', categoryColor: '#D1FAE5', checked: false },
  { id: '6', name: 'Paneer 200g', price: 85, category: 'Dairy', categoryEmoji: '🥛', categoryColor: '#DBEAFE', checked: true },
  { id: '7', name: 'Colgate Toothpaste', price: 120, category: 'Personal Care', categoryEmoji: '🧴', categoryColor: '#CFFAFE', checked: false },
  { id: '8', name: 'Parle-G Biscuits', price: 30, category: 'Snacks', categoryEmoji: '🍪', categoryColor: '#FED7AA', checked: false },
  { id: '9', name: 'Apples 6 pcs', price: null, category: 'Fruits', categoryEmoji: '🍎', categoryColor: '#FCE7F3', checked: false },
  { id: '10', name: 'Sunflower Oil 1L', price: null, category: 'Grains', categoryEmoji: '🌻', categoryColor: '#FEF3C7', checked: false },
];

export const familyItems: ShoppingItem[] = [
  { id: 'f1', name: 'Basmati Rice 5kg', price: 380, category: 'Grains', categoryEmoji: '🌾', categoryColor: '#FEF3C7', checked: false },
  { id: 'f2', name: 'Mixed Vegetables', price: 150, category: 'Vegetables', categoryEmoji: '🥦', categoryColor: '#D1FAE5', checked: true },
  { id: 'f3', name: 'Maggi Noodles 12pk', price: 144, category: 'Snacks', categoryEmoji: '🍜', categoryColor: '#FED7AA', checked: false },
  { id: 'f4', name: 'Dettol Soap 4pk', price: 180, category: 'Personal Care', categoryEmoji: '🧼', categoryColor: '#CFFAFE', checked: false },
  { id: 'f5', name: 'Amul Butter 500g', price: 275, category: 'Dairy', categoryEmoji: '🥛', categoryColor: '#DBEAFE', checked: false },
  { id: 'f6', name: 'Tata Salt 1kg', price: null, category: 'Grains', categoryEmoji: '🧂', categoryColor: '#FEF3C7', checked: false },
];

export const CATEGORIES = [
  { name: 'Vegetables', emoji: '🥦', color: '#D1FAE5' },
  { name: 'Dairy', emoji: '🥛', color: '#DBEAFE' },
  { name: 'Grains', emoji: '🌾', color: '#FEF3C7' },
  { name: 'Pulses', emoji: '🫘', color: '#EDE9FE' },
  { name: 'Fruits', emoji: '🍎', color: '#FCE7F3' },
  { name: 'Snacks', emoji: '🍪', color: '#FED7AA' },
  { name: 'Personal Care', emoji: '🧴', color: '#CFFAFE' },
  { name: 'Beverages', emoji: '☕', color: '#E0E7FF' },
  { name: 'Other', emoji: '🛒', color: '#F3F4F6' },
];

export const historyTrips = [
  {
    id: 'h1',
    displayDate: 'Today, Apr 27',
    label: 'Weekly Groceries',
    totalSpent: 847,
    itemCount: 8,
    store: 'D-Mart',
    items: [
      { name: 'Amul Milk', price: 68 },
      { name: 'Aashirvaad Atta', price: 245 },
      { name: 'Toor Dal', price: 165 },
      { name: 'Tomatoes', price: 32 },
      { name: 'Onions', price: 48 },
      { name: 'Paneer', price: 85 },
      { name: 'Colgate Toothpaste', price: 120 },
      { name: 'Parle-G', price: 84 },
    ],
  },
  {
    id: 'h2',
    displayDate: 'Apr 20',
    label: 'Monthly Restock',
    totalSpent: 1245,
    itemCount: 12,
    store: 'Big Bazaar',
    items: [
      { name: 'Basmati Rice 5kg', price: 380 },
      { name: 'Dal Assorted', price: 340 },
      { name: 'Cooking Oil 5L', price: 525 },
    ],
  },
  {
    id: 'h3',
    displayDate: 'Apr 15',
    label: 'Mid-week Top-up',
    totalSpent: 634,
    itemCount: 7,
    store: 'Local Market',
    items: [
      { name: 'Amul Milk 2L', price: 136 },
      { name: 'Bread', price: 50 },
      { name: 'Eggs 12pc', price: 108 },
      { name: 'Curd 400g', price: 60 },
      { name: 'Banana Bunch', price: 55 },
      { name: 'Spinach', price: 25 },
      { name: 'Cucumber', price: 200 },
    ],
  },
  {
    id: 'h4',
    displayDate: 'Apr 10',
    label: 'Big Monthly Shop',
    totalSpent: 2180,
    itemCount: 18,
    store: 'Reliance Fresh',
    items: [
      { name: 'Rice, Dal, Spices bundle', price: 900 },
      { name: 'Cleaning supplies', price: 680 },
      { name: 'Snacks & Beverages', price: 600 },
    ],
  },
  {
    id: 'h5',
    displayDate: 'Mar 28',
    label: 'Weekly Groceries',
    totalSpent: 920,
    itemCount: 9,
    store: 'Zepto',
    items: [
      { name: 'Milk & Curd', price: 180 },
      { name: 'Vegetables assorted', price: 290 },
      { name: 'Pulses', price: 250 },
      { name: 'Fruits', price: 200 },
    ],
  },
];

export const insightsData = {
  totalThisMonth: 4906,
  totalLastMonth: 4120,
  changePercent: 19,
  categories: [
    { name: 'Vegetables', emoji: '🥦', amount: 1200, percentage: 82, color: '#10B981' },
    { name: 'Dairy', emoji: '🥛', amount: 980, percentage: 67, color: '#0B6E4F' },
    { name: 'Grains', emoji: '🌾', amount: 820, percentage: 56, color: '#FFB800' },
    { name: 'Snacks', emoji: '🍪', amount: 620, percentage: 42, color: '#FA6400' },
    { name: 'Personal Care', emoji: '🧴', amount: 480, percentage: 33, color: '#8B5CF6' },
    { name: 'Fruits', emoji: '🍎', amount: 380, percentage: 26, color: '#EF4444' },
    { name: 'Beverages', emoji: '☕', amount: 280, percentage: 19, color: '#06B6D4' },
    { name: 'Pulses', emoji: '🫘', amount: 148, percentage: 10, color: '#F59E0B' },
  ],
  weeklyBreakdown: [
    { week: 'Wk 1', amount: 1200 },
    { week: 'Wk 2', amount: 980 },
    { week: 'Wk 3', amount: 1450 },
    { week: 'Wk 4', amount: 1276 },
  ],
};
