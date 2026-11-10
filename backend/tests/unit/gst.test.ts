import { placeOfSupplyFor, splitTax, stateCodeOf, stateLabel } from "../../server/utilities/gst.utility";

describe("GST place of supply (BUG-001)", () => {
  const DELHI_SHOP = "07ABCDE1234F1Z5";

  it("reads the state from a GSTIN", () => {
    expect(stateCodeOf("09AAACX1234A1Z5")).toBe("09");
    expect(stateCodeOf("ZZ123")).toBeNull();
    expect(stateCodeOf(null)).toBeNull();
    expect(stateLabel("06")).toBe("06 - Haryana");
  });

  it("a counter sale is in the shop's own state", () => {
    expect(placeOfSupplyFor(DELHI_SHOP, null)).toEqual({ placeOfSupply: "07", isInterState: false });
  });

  it("a registered buyer in another state makes it inter-state", () => {
    expect(placeOfSupplyFor(DELHI_SHOP, "09AAACX1234A1Z5")).toEqual({ placeOfSupply: "09", isInterState: true });
  });

  it("a place chosen on the bill wins over the buyer's GSTIN", () => {
    expect(placeOfSupplyFor(DELHI_SHOP, "09AAACX1234A1Z5", "07")).toEqual({ placeOfSupply: "07", isInterState: false });
    expect(placeOfSupplyFor(DELHI_SHOP, null, "06")).toEqual({ placeOfSupply: "06", isInterState: true });
  });

  it("a shop without a GSTIN never charges IGST", () => {
    expect(placeOfSupplyFor(null, "09AAACX1234A1Z5").isInterState).toBe(false);
  });

  it("splits tax into CGST + SGST, or all IGST", () => {
    expect(splitTax(18.01, false)).toEqual({ cgst: 9.01, sgst: 9, igst: 0 });
    expect(splitTax(18.01, true)).toEqual({ cgst: 0, sgst: 0, igst: 18.01 });
  });
});
