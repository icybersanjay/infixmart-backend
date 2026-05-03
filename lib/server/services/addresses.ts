import { HttpError } from "../api/http.js";
import {
  clearDefaultAddresses,
  createAddress,
  deleteAddressForUser,
  findAddressByIdForUser,
  listAddressesByUserId,
  updateAddressForUser,
} from "../repositories/addresses.js";
import type { Id } from "../types.js";

interface AddressInputBody {
  name?: string;
  fullName?: string;
  mobile?: string;
  phone?: string;
  pincode?: string;
  flatHouse?: string;
  addressLine?: string;
  areaStreet?: string;
  landmark?: string;
  townCity?: string;
  city?: string;
  state?: string;
  country?: string;
  isDefault?: boolean;
}

interface NormalizedAddress {
  name: string;
  mobile: string;
  pincode: string;
  flatHouse: string;
  areaStreet: string;
  landmark: string;
  townCity: string;
  state: string;
  country: string;
  isDefault: boolean;
}

function normalizeAddressPayload(body: AddressInputBody): NormalizedAddress {
  return {
    name: body.fullName || body.name || "",
    mobile: body.phone || body.mobile || "",
    pincode: body.pincode || "",
    flatHouse: body.addressLine || body.flatHouse || "",
    areaStreet: body.areaStreet || "",
    landmark: body.landmark || "",
    townCity: body.city || body.townCity || "",
    state: body.state || "",
    country: body.country || "India",
    isDefault: body.isDefault === true,
  };
}

function validateAddress(payload: NormalizedAddress): void {
  if (
    !payload.name ||
    !payload.mobile ||
    !payload.flatHouse ||
    !payload.townCity ||
    !payload.state ||
    !payload.pincode
  ) {
    throw new HttpError(400, "Please fill all required fields");
  }
}

export async function getMyAddresses(userId: Id) {
  const addresses = await listAddressesByUserId(userId);
  return { error: false as const, data: addresses };
}

export async function addMyAddress(userId: Id, body: AddressInputBody) {
  const payload = normalizeAddressPayload(body);
  validateAddress(payload);

  if (payload.isDefault) {
    await clearDefaultAddresses(userId);
  }

  const address = await createAddress({
    ...payload,
    status: "active",
    userId,
  });

  return {
    error: false as const,
    message: "Address saved successfully!",
    data: address,
  };
}

export async function updateMyAddress(
  userId: Id,
  id: Id,
  body: AddressInputBody
) {
  const existing = await findAddressByIdForUser(id, userId);
  if (!existing) {
    throw new HttpError(404, "Address not found");
  }

  const payload = normalizeAddressPayload(body);
  validateAddress(payload);

  if (payload.isDefault) {
    await clearDefaultAddresses(userId);
  }

  const updated = await updateAddressForUser(id, userId, {
    ...payload,
    isDefault: payload.isDefault ? 1 : 0,
  });

  return {
    error: false as const,
    message: "Address updated successfully!",
    data: updated,
  };
}

export async function deleteMyAddress(userId: Id, id: Id) {
  const deleted = await deleteAddressForUser(id, userId);
  if (!deleted) {
    throw new HttpError(404, "Address not found");
  }

  return {
    error: false as const,
    message: "Address deleted",
  };
}
