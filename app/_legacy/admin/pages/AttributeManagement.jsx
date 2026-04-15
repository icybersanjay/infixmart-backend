"use client";

import { useEffect, useRef, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdCheck, MdClose } from "react-icons/md";
import adminAxios from "../utils/adminAxios";
import toast, { Toaster } from "react-hot-toast";

const inputStyle = { padding: "0.55rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.875rem", outline: "none" };
const primaryBtn = { padding: "0.55rem 0.9rem", background: "#1565C0", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.3rem" };
const dangerIcon = { background: "#FFEBEE", border: "none", borderRadius: 6, padding: "0.3rem 0.4rem", cursor: "pointer", color: "#E53935", display: "flex", alignItems: "center" };

// ── Inline edit for type name ──────────────────────────────────────────────────
function InlineNameEdit({ type, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(type.name);

  const save = async () => {
    if (!val.trim() || val.trim() === type.name) { setEditing(false); return; }
    try {
      await adminAxios.put(`/api/admin/attributes/${type.id}`, { name: val.trim() });
      onSaved({ ...type, name: val.trim() });
      toast.success("Renamed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Rename failed");
      setVal(type.name);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flex: 1 }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }} autoFocus style={{ ...inputStyle, flex: 1, fontSize: "0.875rem", padding: "0.25rem 0.5rem" }} />
        <button onClick={save}   style={{ background: "#E8F5E9", border: "none", borderRadius: 4, padding: "0.3rem", cursor: "pointer", color: "#00A651" }}><MdCheck /></button>
        <button onClick={() => setEditing(false)} style={{ background: "#FFEBEE", border: "none", borderRadius: 4, padding: "0.3rem", cursor: "pointer", color: "#E53935" }}><MdClose /></button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1 }}>
      <span style={{ fontWeight: 600, color: "#1A237E", fontSize: "0.9rem" }}>{type.name}</span>
      <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1565C0", display: "flex", alignItems: "center", padding: 2 }}>
        <MdEdit style={{ fontSize: "0.85rem" }} />
      </button>
    </div>
  );
}

export default function AttributeManagement() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected AttributeType
  const [newTypeName, setNewTypeName] = useState("");
  const [addingType, setAddingType] = useState(false);
  const [deletingType, setDeletingType] = useState(null);
  const [newValue, setNewValue] = useState("");
  const [addingValue, setAddingValue] = useState(false);
  const [deletingValue, setDeletingValue] = useState(null);
  const typeInputRef = useRef();

  const loadTypes = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("/api/admin/attributes");
      const data = res.data.data || [];
      setTypes(data);
      // Keep selected in sync
      if (selected) {
        const updated = data.find((t) => t.id === selected.id);
        setSelected(updated || null);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTypes(); }, []);

  // ── Add attribute type ──────────────────────────────────────────────────────
  const handleAddType = async () => {
    if (!newTypeName.trim()) return;
    setAddingType(true);
    try {
      const res = await adminAxios.post("/api/admin/attributes", { name: newTypeName.trim() });
      const newType = res.data.data;
      setTypes((prev) => [...prev, newType]);
      setNewTypeName("");
      typeInputRef.current?.focus();
      toast.success(`"${newType.name}" added`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Already exists");
    } finally { setAddingType(false); }
  };

  // ── Delete attribute type ───────────────────────────────────────────────────
  const handleDeleteType = async (type) => {
    setDeletingType(type.id);
    try {
      await adminAxios.delete(`/api/admin/attributes/${type.id}`);
      setTypes((prev) => prev.filter((t) => t.id !== type.id));
      if (selected?.id === type.id) setSelected(null);
      toast.success(`"${type.name}" deleted`);
    } catch { toast.error("Delete failed"); }
    finally { setDeletingType(null); }
  };

  // ── Add attribute value ─────────────────────────────────────────────────────
  const handleAddValue = async () => {
    if (!newValue.trim() || !selected) return;
    setAddingValue(true);
    try {
      const res = await adminAxios.post(`/api/admin/attributes/${selected.id}/values`, { value: newValue.trim() });
      const addedValue = res.data.data;
      setSelected((prev) => ({ ...prev, values: [...(prev.values || []), addedValue] }));
      setTypes((prev) => prev.map((t) => t.id === selected.id ? { ...t, values: [...(t.values || []), addedValue] } : t));
      setNewValue("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Add failed");
    } finally { setAddingValue(false); }
  };

  // ── Delete attribute value ──────────────────────────────────────────────────
  const handleDeleteValue = async (valueId) => {
    setDeletingValue(valueId);
    try {
      await adminAxios.delete(`/api/admin/attributes/${selected.id}/values/${valueId}`);
      const updatedValues = (selected.values || []).filter((v) => v.id !== valueId);
      setSelected((prev) => ({ ...prev, values: updatedValues }));
      setTypes((prev) => prev.map((t) => t.id === selected.id ? { ...t, values: updatedValues } : t));
    } catch { toast.error("Delete failed"); }
    finally { setDeletingValue(null); }
  };

  const selectedValues = selected?.values || [];

  return (
    <div>
      <Toaster position="top-right" />

      <div style={{ display: "flex", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1A237E", margin: 0 }}>Product Attributes</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "1rem", alignItems: "start" }}>

        {/* ── LEFT: Attribute types list ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #E0E0E0", background: "#F9FAFB" }}>
            <span style={{ fontWeight: 600, color: "#1A237E", fontSize: "0.9rem" }}>Attribute Types</span>
            <span style={{ marginLeft: 8, background: "#E3F2FD", color: "#1565C0", borderRadius: 99, padding: "0.1rem 0.45rem", fontSize: "0.73rem", fontWeight: 700 }}>{types.length}</span>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#999", fontSize: "0.875rem" }}>Loading…</div>
          ) : types.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#bbb", fontSize: "0.875rem" }}>No attribute types yet.</div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {types.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelected(type)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.7rem 1rem", cursor: "pointer",
                    background: selected?.id === type.id ? "#E3F2FD" : "transparent",
                    borderLeft: selected?.id === type.id ? "4px solid #1565C0" : "4px solid transparent",
                    borderBottom: "1px solid #F5F5F5",
                    transition: "background 0.15s",
                  }}
                >
                  <InlineNameEdit type={type} onSaved={loadTypes} />
                  <span style={{ fontSize: "0.73rem", color: "#999", whiteSpace: "nowrap" }}>
                    {(type.values || []).length} vals
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteType(type); }}
                    disabled={deletingType === type.id}
                    style={{ ...dangerIcon, opacity: deletingType === type.id ? 0.5 : 1 }}
                    title="Delete type"
                  >
                    <MdDelete style={{ fontSize: "0.9rem" }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add type input */}
          <div style={{ padding: "0.9rem 1rem", borderTop: "1px solid #E0E0E0", display: "flex", gap: "0.5rem" }}>
            <input
              ref={typeInputRef}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddType(); }}
              placeholder="e.g. Color"
              style={{ ...inputStyle, flex: 1, fontSize: "0.875rem" }}
            />
            <button onClick={handleAddType} disabled={addingType || !newTypeName.trim()} style={{ ...primaryBtn, opacity: addingType || !newTypeName.trim() ? 0.6 : 1, cursor: addingType || !newTypeName.trim() ? "not-allowed" : "pointer" }}>
              {addingType ? "…" : <MdAdd />}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Values for selected type ── */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden" }}>
          <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #E0E0E0", background: "#F9FAFB", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {selected ? (
              <>
                <span style={{ fontWeight: 600, color: "#1A237E", fontSize: "0.9rem" }}>{selected.name} Values</span>
                <span style={{ background: "#E3F2FD", color: "#1565C0", borderRadius: 99, padding: "0.1rem 0.45rem", fontSize: "0.73rem", fontWeight: 700 }}>{selectedValues.length}</span>
              </>
            ) : (
              <span style={{ color: "#999", fontSize: "0.875rem" }}>← Select an attribute type to manage its values</span>
            )}
          </div>

          {!selected ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏷️</div>
              <p style={{ color: "#999", fontSize: "0.9rem", margin: 0 }}>
                Select an attribute type on the left to see and manage its values.
              </p>
              <p style={{ color: "#bbb", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                Examples: Color → Black, Blue, Silver · Size → S, M, L, XL · Weight → 500g, 1kg
              </p>
            </div>
          ) : (
            <>
              {/* Values pills */}
              <div style={{ padding: "1rem", minHeight: 180 }}>
                {selectedValues.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "#bbb", fontSize: "0.875rem" }}>
                    No values yet. Add some below.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {selectedValues.map((v) => (
                      <div
                        key={v.id}
                        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "#F5F5F5", border: "1px solid #E0E0E0", borderRadius: 99, padding: "0.3rem 0.75rem", fontSize: "0.875rem", color: "#333" }}
                      >
                        <span>{v.value}</span>
                        <button
                          onClick={() => handleDeleteValue(v.id)}
                          disabled={deletingValue === v.id}
                          style={{ background: "none", border: "none", cursor: deletingValue === v.id ? "not-allowed" : "pointer", color: deletingValue === v.id ? "#ccc" : "#E53935", display: "flex", alignItems: "center", padding: 0, lineHeight: 1 }}
                          title="Remove"
                        >
                          <MdClose style={{ fontSize: "0.85rem" }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add value input */}
              <div style={{ padding: "0.9rem 1rem", borderTop: "1px solid #E0E0E0", display: "flex", gap: "0.5rem" }}>
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddValue(); }}
                  placeholder={`Add value to ${selected.name}…`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={handleAddValue} disabled={addingValue || !newValue.trim()} style={{ ...primaryBtn, opacity: addingValue || !newValue.trim() ? 0.6 : 1, cursor: addingValue || !newValue.trim() ? "not-allowed" : "pointer" }}>
                  {addingValue ? "Adding…" : <><MdAdd /> Add</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tip */}
      <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#E3F2FD", borderRadius: 6, border: "1px solid #BBDEFB", fontSize: "0.8rem", color: "#1565C0" }}>
        <strong>Tip:</strong> These attribute types and values feed the Variants section in the Product Add/Edit form. Create your attribute types here first, then use them when adding products.
      </div>
    </div>
  );
}
