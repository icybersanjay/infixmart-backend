"use client";

import { useEffect, useRef, useState } from "react";
import { MdEdit, MdDelete, MdClose, MdAdd, MdImage } from "react-icons/md";
import adminAxios from "../_lib/adminAxios";
import TableRowSkeleton from "../../../_legacy/components/skeletons/TableRowSkeleton";
import EmptyState from "../../../_legacy/components/EmptyState";
import { required, minLength } from "../../../_legacy/hooks/useForm";

const imgUrl = (p) => (p ? p : "");

/* ── Preset 3D-style emoji icons organised by common e-commerce categories ── */
const PRESET_ICONS = [
  // Electronics & Tech
  { label: "Mobile / Phones",     icon: "📱" },
  { label: "Laptop / PC",         icon: "💻" },
  { label: "TV / Display",        icon: "📺" },
  { label: "Monitor / Desktop",   icon: "🖥️" },
  { label: "Tablet",              icon: "📲" },
  { label: "Smartwatch",          icon: "⌚" },
  { label: "Headphones",          icon: "🎧" },
  { label: "Earbuds",             icon: "🎵" },
  { label: "Speaker",             icon: "🔊" },
  { label: "Camera",              icon: "📷" },
  { label: "Photography",         icon: "📸" },
  { label: "Gaming",              icon: "🎮" },
  { label: "Game Controller",     icon: "🕹️" },
  { label: "Mouse / Keyboard",    icon: "🖱️" },
  { label: "Printer",             icon: "🖨️" },
  { label: "Charger / Power",     icon: "🔋" },
  { label: "Router / Network",    icon: "📡" },
  { label: "Drone",               icon: "🛸" },
  { label: "Smart Devices",       icon: "🤖" },
  { label: "Smart Gadgets",       icon: "⚡" },
  // Clothing & Fashion
  { label: "Clothing / T-Shirt",  icon: "👕" },
  { label: "Dresses",             icon: "👗" },
  { label: "Footwear",            icon: "👟" },
  { label: "Formal Shoes",        icon: "👞" },
  { label: "Sandals / Slippers",  icon: "🩴" },
  { label: "Hats & Caps",         icon: "🧢" },
  { label: "Sunglasses",          icon: "🕶️" },
  { label: "Jackets & Coats",     icon: "🧥" },
  { label: "Winter Wear / Scarf", icon: "🧣" },
  { label: "Swimwear",            icon: "🩱" },
  { label: "Bags / Handbags",     icon: "👜" },
  { label: "Backpacks",           icon: "🎒" },
  { label: "Luggage / Travel Bag",icon: "🧳" },
  { label: "Socks / Hosiery",     icon: "🧦" },
  // Jewellery & Accessories
  { label: "Jewellery / Rings",   icon: "💍" },
  { label: "Beads / Bracelets",   icon: "📿" },
  { label: "Premium / Luxury",    icon: "👑" },
  // Beauty & Health
  { label: "Beauty / Makeup",     icon: "💄" },
  { label: "Skincare",            icon: "🧴" },
  { label: "Personal Care",       icon: "🪥" },
  { label: "Health / Medicine",   icon: "💊" },
  { label: "Medical / First Aid", icon: "🩹" },
  { label: "Gym / Supplements",   icon: "💪" },
  { label: "Yoga / Wellness",     icon: "🧘" },
  // Kitchen & Food
  { label: "Kitchen Cookware",    icon: "🍳" },
  { label: "Bottles & Flasks",    icon: "🥤" },
  { label: "Coffee & Tea",        icon: "☕" },
  { label: "Dinnerware / Plates", icon: "🍽️" },
  { label: "Cutlery",             icon: "🍴" },
  { label: "Baking",              icon: "🧁" },
  { label: "Food & Snacks",       icon: "🍕" },
  { label: "Meat & Seafood",      icon: "🥩" },
  { label: "Vegetables",          icon: "🥦" },
  { label: "Fruits",              icon: "🍎" },
  { label: "Dairy / Eggs",        icon: "🥛" },
  // Home & Living
  { label: "Home & Kitchen",      icon: "🏠" },
  { label: "Furniture",           icon: "🛋️" },
  { label: "Bedroom",             icon: "🛏️" },
  { label: "Home Decor / Plants", icon: "🪴" },
  { label: "Lighting",            icon: "💡" },
  { label: "Cleaning",            icon: "🧹" },
  { label: "Bathroom",            icon: "🛁" },
  { label: "Mirrors",             icon: "🪞" },
  { label: "Clocks",              icon: "⏰" },
  { label: "Candles & Fragrance", icon: "🕯️" },
  { label: "Hook / Wall Hook",    icon: "🪝" },
  { label: "Cloth Hanger",        icon: "👔" },
  { label: "Storage & Organiser", icon: "🗂️" },
  // Sports & Outdoors
  { label: "Sports & Fitness",    icon: "🏋️" },
  { label: "Ball Sports",         icon: "⚽" },
  { label: "Cricket",             icon: "🏏" },
  { label: "Tennis / Badminton",  icon: "🎾" },
  { label: "Basketball",          icon: "🏀" },
  { label: "Swimming",            icon: "🏊" },
  { label: "Cycling",             icon: "🚴" },
  { label: "Boxing / Martial Arts", icon: "🥊" },
  { label: "Golf",                icon: "⛳" },
  { label: "Fishing",             icon: "🎣" },
  { label: "Outdoors / Camping",  icon: "🏕️" },
  { label: "Winter Sports",       icon: "⛷️" },
  // Automotive
  { label: "Auto & Cars",         icon: "🚗" },
  { label: "Motorcycles",         icon: "🏍️" },
  { label: "Tyres & Wheels",      icon: "🛞" },
  // Tools & Office
  { label: "Tools & Hardware",    icon: "🔧" },
  { label: "Hand Tools",          icon: "🔨" },
  { label: "Books & Stationery",  icon: "📚" },
  { label: "Pens & Pencils",      icon: "✏️" },
  { label: "Office / Briefcase",  icon: "💼" },
  { label: "Office Equipment",    icon: "🖨️" },
  // Kids, Baby & Pets
  { label: "Toys",                icon: "🧸" },
  { label: "Baby Products",       icon: "🍼" },
  { label: "Kids / Rides",        icon: "🎠" },
  { label: "Pets",                icon: "🐾" },
  { label: "Dogs",                icon: "🐕" },
  { label: "Cats",                icon: "🐈" },
  // Automotive additions
  { label: "Scooter / Two-Wheeler", icon: "🛵" },
  { label: "Auto Rickshaw",       icon: "🛺" },
  // Tools & Hardware additions
  { label: "Locks & Keys",        icon: "🔑" },
  { label: "Ladders",             icon: "🪜" },
  { label: "Magnets / Hardware",  icon: "🧲" },
  { label: "Fire Safety",         icon: "🧯" },
  { label: "Measuring Tools",     icon: "📏" },
  { label: "Drafting / Architect",icon: "📐" },
  // Sports additions
  { label: "Trophies / Awards",   icon: "🏆" },
  { label: "Medals",              icon: "🥇" },
  { label: "Darts / Target Games",icon: "🎯" },
  { label: "Board Games / Dice",  icon: "🎲" },
  { label: "Puzzles",             icon: "🧩" },
  { label: "Yo-yo / Spin Toys",   icon: "🪀" },
  { label: "Table Tennis",        icon: "🏓" },
  { label: "Archery",             icon: "🏹" },
  { label: "Skateboard",          icon: "🛹" },
  { label: "Roller Skates",       icon: "🛼" },
  { label: "Surfing / Water Sports", icon: "🏄" },
  { label: "Horse Riding",        icon: "🏇" },
  { label: "Gymnastics",          icon: "🤸" },
  { label: "Sports Net / Goal",   icon: "🥅" },
  // Clothing additions
  { label: "Women's Hat",         icon: "👒" },
  { label: "Formal Hat",          icon: "🎩" },
  { label: "Eyeglasses",          icon: "👓" },
  { label: "Gloves",              icon: "🧤" },
  { label: "Innerwear",           icon: "🩲" },
  { label: "Shorts / Casuals",    icon: "🩳" },
  { label: "Sportswear / Jersey", icon: "🎽" },
  { label: "Boots / Trekking Shoes", icon: "🥾" },
  { label: "Ethnic Wear / Saree", icon: "🥻" },
  // Jewellery addition
  { label: "Diamond / Luxury",    icon: "💎" },
  // Health additions
  { label: "Eye Care / Opticals", icon: "👁️" },
  { label: "Dental Care",         icon: "🦷" },
  { label: "Thermometer",         icon: "🌡️" },
  { label: "Stethoscope",         icon: "🩺" },
  { label: "Injections / Vaccine",icon: "💉" },
  { label: "Lab / Testing Kits",  icon: "🧪" },
  // Kitchen & Food additions
  { label: "Teapot / Kettle",     icon: "🫖" },
  { label: "Tiffin / Lunchbox",   icon: "🍱" },
  { label: "Spices / Masala",     icon: "🌶️" },
  { label: "Salt / Condiments",   icon: "🧂" },
  { label: "Jars / Pickles",      icon: "🫙" },
  { label: "Canned Goods",        icon: "🥫" },
  { label: "Cakes / Desserts",    icon: "🍰" },
  { label: "Salads / Health Food",icon: "🥗" },
  { label: "Noodles / Pasta",     icon: "🍜" },
  { label: "Bread / Bakery",      icon: "🥐" },
  { label: "Juices / Beverages",  icon: "🧃" },
  // Home additions
  { label: "Doors / Entry",       icon: "🚪" },
  { label: "Windows / Curtains",  icon: "🪟" },
  { label: "Chairs / Seating",    icon: "🪑" },
  { label: "Wall Art / Frames",   icon: "🖼️" },
  { label: "Baskets / Laundry",   icon: "🧺" },
  { label: "Buckets / Mopping",   icon: "🪣" },
  { label: "Shower / Bath",       icon: "🚿" },
  { label: "Tissue / Paper",      icon: "🧻" },
  { label: "Wood / Natural",      icon: "🪵" },
  // Music & Arts
  { label: "Microphone / Karaoke",icon: "🎤" },
  { label: "Piano / Keyboard Inst",icon: "🎹" },
  { label: "Drums",               icon: "🥁" },
  { label: "Wind Instruments",    icon: "🎺" },
  { label: "String Instruments",  icon: "🎻" },
  { label: "Ukulele / Folk Music",icon: "🪕" },
  { label: "Scissors / Craft",    icon: "✂️" },
  { label: "Thread / Sewing",     icon: "🧵" },
  { label: "Yarn / Knitting",     icon: "🧶" },
  { label: "Paintbrush / Art",    icon: "🖌️" },
  { label: "Costumes / Theater",  icon: "🎭" },
  // Travel & Arts
  { label: "Travel",              icon: "✈️" },
  { label: "Railway / Train",     icon: "🚂" },
  { label: "Trekking / Hiking",   icon: "🏔️" },
  { label: "Beach Gear",          icon: "🏖️" },
  { label: "Water Sports",        icon: "🌊" },
  { label: "Maps / GPS",          icon: "🗺️" },
  { label: "Art & Craft",         icon: "🎨" },
  { label: "Music Instruments",   icon: "🎸" },
  { label: "Movies / Media",      icon: "🎬" },
  // Office & School
  { label: "Notice Board / Pins", icon: "📌" },
  { label: "Clips / Fasteners",   icon: "📎" },
  { label: "Calculator",          icon: "🧮" },
  { label: "Bookmarks / Planner", icon: "🔖" },
  { label: "Ball Pen / Writing",  icon: "🖊️" },
  { label: "School / Education",  icon: "🏫" },
  // Pets additions
  { label: "Aquarium / Fish",     icon: "🐠" },
  { label: "Birds / Exotic Pets", icon: "🐦" },
  { label: "Rabbits / Small Pets",icon: "🐇" },
  { label: "Hamsters / Rodents",  icon: "🐹" },
  // Kids additions
  { label: "Science Toys",        icon: "🔭" },
  { label: "Space / Tech Toys",   icon: "🚀" },
  // Misc
  { label: "Gifts",               icon: "🎁" },
  { label: "Food & Grocery",      icon: "🛒" },
  { label: "Garden & Plants",     icon: "🌱" },
  { label: "Flowers / Floral",    icon: "🌺" },
  { label: "Garden / Sunflower",  icon: "🌻" },
  { label: "Ribbons / Gift Wrap", icon: "🎀" },
  { label: "Magic / Novelty",     icon: "🪄" },
  { label: "Eco / Sustainable",   icon: "♻️" },
  { label: "Organic / Herbal",    icon: "🌿" },
  { label: "Spiritual / Décor",   icon: "🧿" },
  { label: "Featured / Special",  icon: "💫" },
  { label: "Other / General",     icon: "🌟" },
];

/* Resolve display value: returns { type:'emoji'|'img', value:string } */
const resolveIcon = (images) => {
  const raw = images?.[0];
  if (!raw) return null;
  if (raw.startsWith("emoji:")) return { type: "emoji", value: raw.slice(6) };
  return { type: "img", value: raw };
};

function flatten(cats, depth = 0) {
  return cats.flatMap((cat) => [
    { ...cat, depth },
    ...flatten(cat.children || [], depth + 1),
  ]);
}

const DEPTH_BADGE = [
  "bg-blue-100 text-[#1565C0]",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
];
const DEPTH_LABEL = ["Root", "Sub", "Third"];

export default function CategoryManagement() {
  const [categories,   setCategories]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [form,         setForm]         = useState({ name: "", parentCatId: "", parentCatName: "", images: [] });
  const [imgUploading, setImgUploading] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [nameError,    setNameError]    = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [iconTab,      setIconTab]      = useState("preset"); // "preset" | "upload"
  const [iconSearch,   setIconSearch]   = useState("");
  const fileRef = useRef();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/category");
      setCategories(flatten(res.data.data || []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCategories(); }, []);

  const validateName = (val) =>
    required("Category name is required")(val) || minLength(2, "Name must be at least 2 characters")(val);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: "", parentCatId: "", parentCatName: "", images: [] });
    setNameError("");
    setIconSearch("");
    setModal(true);
  };

  const openEdit = (cat) => {
    setEditItem(cat);
    setForm({ name: cat.name, parentCatId: cat.parentCatId ? String(cat.parentCatId) : "", parentCatName: cat.parentCatName || "", images: cat.images || [] });
    setNameError("");
    setIconSearch("");
    setModal(true);
  };

  const handleParentChange = (e) => {
    const id = e.target.value;
    const parent = categories.find((c) => String(c.id) === id);
    setForm((f) => ({ ...f, parentCatId: id, parentCatName: parent?.name || "" }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("images", file);
      const res = await adminAxios.post("/api/category/upload-images", fd);
      setForm((f) => ({ ...f, images: [res.data.images[0]] }));
    } catch (err) { console.error(err); }
    finally { setImgUploading(false); }
  };

  const handleSave = async () => {
    const err = validateName(form.name);
    if (err) { setNameError(err); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), images: form.images, parentCatId: form.parentCatId || null, parentCatName: form.parentCatName || null };
      if (editItem) await adminAxios.put(`/api/category/${editItem.id}`, payload);
      else          await adminAxios.post("/api/category/createcat", payload);
      setModal(false);
      loadCategories();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminAxios.delete(`/api/category/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadCategories();
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const parentOptions = editItem
    ? (() => {
        const isDescendant = (cat) => {
          let c = cat;
          while (c) {
            if (String(c.id) === String(editItem.id)) return true;
            c = categories.find((x) => String(x.id) === String(c.parentCatId));
          }
          return false;
        };
        return categories.filter((c) => !isDescendant(c));
      })()
    : categories;

  const autoSlug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const inputCls = "w-full px-3.5 py-2.5 text-[13px] text-gray-700 bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all";
  const labelCls = "block text-[11px] font-[700] uppercase tracking-wider text-gray-400 mb-1.5";

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-[800] text-[#1A237E]">
          All Categories
          {!loading && <span className="ml-2 text-[13px] font-[400] text-gray-400">({categories.length})</span>}
        </h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors"
        >
          <MdAdd className="text-[16px]" /> Add Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F8FAFF] border-b border-gray-100">
                {["Image", "Name", "Parent", "Type", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-[700] uppercase tracking-wider text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={5} widths={[40, 160, 110, 70, 80]} />)
                : categories.length === 0
                ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState title="No categories yet" subtitle="Add your first category to organise products." actionLabel="Add Category" onAction={openAdd} />
                      </td>
                    </tr>
                  )
                : categories.map((cat) => (
                    <tr key={cat.id} className="border-b border-gray-50 hover:bg-[#F8FAFF] transition-colors">
                      <td className="px-4 py-3">
                        {(() => {
                          const icon = resolveIcon(cat.images);
                          if (!icon) return (
                            <div className="w-9 h-9 rounded-full bg-[#E8EAF6] flex items-center justify-center text-[#7986CB] text-[13px] font-[700]">
                              {cat.name.charAt(0).toUpperCase()}
                            </div>
                          );
                          if (icon.type === "emoji") return (
                            <div className="w-9 h-9 rounded-full bg-[#EEF4FF] flex items-center justify-center text-[1.4rem]">
                              {icon.value}
                            </div>
                          );
                          return <img src={icon.value} alt={cat.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />;
                        })()}
                      </td>
                      <td className="px-4 py-3" style={{ paddingLeft: `${1 + cat.depth * 1.5}rem` }}>
                        {cat.depth > 0 && <span className="text-gray-300 mr-1 text-[11px]">└ </span>}
                        <span className={cat.depth === 0 ? "font-[700] text-gray-800" : "font-[400] text-gray-600"}>
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{cat.parentCatName || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-[700] ${DEPTH_BADGE[cat.depth] ?? DEPTH_BADGE[1]}`}>
                          {DEPTH_LABEL[cat.depth] ?? "Sub"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(cat)} className="p-1.5 bg-blue-50 text-[#1565C0] rounded-lg hover:bg-blue-100 transition-colors"><MdEdit className="text-[15px]" /></button>
                          <button onClick={() => setDeleteTarget(cat)} className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><MdDelete className="text-[15px]" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[15px] font-[800] text-[#1A237E]">{editItem ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                <MdClose className="text-[18px]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Name <span className="text-red-500">*</span></label>
                <input
                  className={`${inputCls} ${nameError ? "border-red-400" : ""}`}
                  value={form.name}
                  onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setNameError(""); }}
                  onBlur={(e) => setNameError(validateName(e.target.value))}
                  placeholder="e.g. Electronics"
                />
                {nameError && <p className="text-red-500 text-[11px] mt-1">{nameError}</p>}
              </div>

              <div>
                <label className={labelCls}>Slug (auto-generated)</label>
                <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={autoSlug} readOnly />
              </div>

              <div>
                <label className={labelCls}>Parent Category <span className="text-gray-400 normal-case font-[500]">(optional)</span></label>
                <select className={inputCls} value={form.parentCatId} onChange={handleParentChange}>
                  <option value="">— None (root category) —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {"  ".repeat(c.depth)}{c.depth > 0 ? "└ " : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Category Icon ── */}
              <div>
                <label className={labelCls}>Category Icon</label>

                {/* Tab switcher */}
                <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl">
                  {[["preset", "🎨 Choose Icon"], ["upload", "📁 Upload Image"]].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIconTab(key)}
                      className={`flex-1 py-1.5 text-[12px] font-[600] rounded-lg transition-all ${
                        iconTab === key ? "bg-white shadow-sm text-[#1565C0]" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {iconTab === "preset" ? (
                  <div>
                    <input
                      type="text"
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      placeholder="🔍  Search icons… (e.g. kitchen, sport)"
                      className="w-full px-3 py-2 text-[12px] bg-[#F8FAFF] border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/10 transition-all mb-2"
                    />
                    <div className="grid grid-cols-8 gap-1.5 max-h-[240px] overflow-y-auto pr-1">
                      {(iconSearch.trim()
                        ? PRESET_ICONS.filter(({ label }) => label.toLowerCase().includes(iconSearch.toLowerCase()))
                        : PRESET_ICONS
                      ).map(({ icon, label }) => {
                        const val = `emoji:${icon}`;
                        const selected = form.images?.[0] === val;
                        return (
                          <button
                            key={icon}
                            type="button"
                            title={label}
                            onClick={() => setForm((f) => ({ ...f, images: [val] }))}
                            className={`flex items-center justify-center h-11 rounded-xl text-[1.6rem] transition-all border-2 ${
                              selected
                                ? "border-[#1565C0] bg-[#EEF4FF] scale-110 shadow-md"
                                : "border-transparent bg-gray-50 hover:bg-[#F0F5FF] hover:border-[#1565C0]/30"
                            }`}
                          >
                            {icon}
                          </button>
                        );
                      })}
                      {iconSearch.trim() && PRESET_ICONS.filter(({ label }) => label.toLowerCase().includes(iconSearch.toLowerCase())).length === 0 && (
                        <p className="col-span-8 text-center text-[11px] text-gray-400 py-4">No icons found for "{iconSearch}"</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-2">512 × 512 px recommended. PNG, JPG or WebP.</p>
                    <div
                      onClick={() => fileRef.current.click()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-[#1565C0] hover:bg-[#F0F5FF] transition-all"
                    >
                      <MdImage className="text-gray-300 text-[28px] mx-auto mb-1" />
                      <p className="text-[12px] text-gray-400">{imgUploading ? "Uploading…" : "Click to upload image"}</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>
                )}

                {/* Current selection preview */}
                {form.images?.[0] && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-[#F8FAFF] rounded-xl border border-gray-100">
                    {form.images[0].startsWith("emoji:") ? (
                      <span className="text-[2.5rem] leading-none">{form.images[0].slice(6)}</span>
                    ) : (
                      <img src={imgUrl(form.images[0])} alt="preview" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-[600] text-gray-700">
                        {form.images[0].startsWith("emoji:") ? "Emoji icon selected" : "Custom image"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{form.images[0]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, images: [] }))}
                      className="w-6 h-6 rounded-full bg-red-100 text-red-500 text-[13px] flex items-center justify-center hover:bg-red-200 flex-shrink-0"
                    >×</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(false)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !!nameError || !form.name.trim()}
                className="px-5 py-2.5 bg-[#1565C0] text-white text-[13px] font-[700] rounded-xl hover:bg-[#1251A3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-[16px] font-[800] text-gray-800 mb-2">Delete Category</h3>
            <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
              Delete <strong>"{deleteTarget.name}"</strong>? All subcategories will also be removed. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 border border-gray-200 text-[13px] font-[600] text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="px-5 py-2.5 bg-red-500 text-white text-[13px] font-[700] rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
