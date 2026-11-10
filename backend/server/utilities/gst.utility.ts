import { twoDecimalFloat } from "./common.utility";

// GST state codes: the first two digits of every GSTIN
export const GST_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

export const GST_STATE_CODES = Object.keys(GST_STATES);

export const stateCodeOf = (gstin?: string | null) => {
  const code = (gstin || "").trim().slice(0, 2);
  return GST_STATES[code] ? code : null;
};

export const stateLabel = (code?: string | null) => (code && GST_STATES[code] ? `${code} - ${GST_STATES[code]}` : null);

// Place of supply: chosen on the bill, else the registered buyer's state, else the shop's own state
// (a counter sale). A different state from the shop's makes it an inter-state supply, taxed as IGST.
export const placeOfSupplyFor = (shopGstin: string, customerGstin: string, chosen?: string | null) => {
  const shopState = stateCodeOf(shopGstin);
  const placeOfSupply = (chosen && GST_STATES[chosen] ? chosen : null) || stateCodeOf(customerGstin) || shopState;
  return { placeOfSupply, isInterState: !!shopState && !!placeOfSupply && placeOfSupply !== shopState };
};

// Within a state the tax is split equally into CGST and SGST; across states it is all IGST
export const splitTax = (tax: number, isInterState: boolean) => {
  if (isInterState) return { cgst: 0, sgst: 0, igst: twoDecimalFloat(tax) };
  const cgst = twoDecimalFloat(tax / 2);
  return { cgst, sgst: twoDecimalFloat(tax - cgst), igst: 0 };
};
