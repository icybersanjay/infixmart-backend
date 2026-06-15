import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/server/repositories/products.js", () => ({
  listProducts: vi.fn(),
}));

const productsRepo = await import("../lib/server/repositories/products.js");
const { exportProductsCsv } = await import("../lib/server/services/admin.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exportProductsCsv for Meta Catalog", () => {
  it("formats products correctly for Meta/Facebook catalog format", async () => {
    productsRepo.listProducts.mockResolvedValueOnce({
      products: [
        {
          id: 101,
          name: "Awesome T-Shirt",
          slug: "awesome-t-shirt",
          sku: "TSHIRT-101",
          description: "<p>This is a <strong>cool</strong> T-Shirt!</p>",
          images: ["/uploads/tshirt.jpg"],
          brand: "SuperBrand",
          price: 499.99,
          countInStock: 15,
        },
        {
          id: 102,
          name: "Plain Mug",
          slug: "plain-mug",
          sku: "MUG-102",
          description: "",
          images: [],
          brand: null,
          price: 120,
          countInStock: 0,
        },
      ],
    });

    const csv = await exportProductsCsv({ status: "active" });
    const lines = csv.split("\n");

    expect(lines[0]).toBe("id,title,description,availability,condition,price,link,image_link,brand");

    // Line 1: 101
    // Description should be stripped of HTML: "This is a cool T-Shirt!"
    // Availability: "in stock"
    // Condition: "new"
    // Price: "499.99 INR"
    // Link: absolute URL
    // Image Link: absolute URL
    // Brand: "SuperBrand"
    const line1 = lines[1].split(",");
    expect(line1[0]).toBe("101");
    expect(line1[1]).toBe("Awesome T-Shirt");
    expect(line1[2]).toBe("This is a cool T-Shirt!");
    expect(line1[3]).toBe("in stock");
    expect(line1[4]).toBe("new");
    expect(line1[5]).toBe("499.99 INR");
    expect(line1[6]).toContain("/product/awesome-t-shirt");
    expect(line1[7]).toContain("/uploads/tshirt.jpg");
    expect(line1[8]).toBe("SuperBrand");

    // Line 2: 102
    // Description should fallback to title: "Plain Mug"
    // Availability: "out of stock"
    // Condition: "new"
    // Price: "120.00 INR"
    // Link: absolute URL
    // Image Link: ""
    // Brand fallback: "InfixMart"
    const line2 = lines[2].split(",");
    expect(line2[0]).toBe("102");
    expect(line2[1]).toBe("Plain Mug");
    expect(line2[2]).toBe("Plain Mug");
    expect(line2[3]).toBe("out of stock");
    expect(line2[4]).toBe("new");
    expect(line2[5]).toBe("120.00 INR");
    expect(line2[6]).toContain("/product/plain-mug");
    expect(line2[7]).toBe("");
    expect(line2[8]).toBe("InfixMart");
  });
});
