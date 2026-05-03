import type { RowDataPacket } from "mysql2/promise";
import { execute, query } from "../db/mysql.js";
import type { Address, AddressRow, Id } from "../types.js";

const ADDRESS_SELECT = `
  id,
  name,
  mobile,
  pincode,
  flatHouse,
  areaStreet,
  landmark,
  townCity,
  state,
  country,
  status,
  isDefault,
  userId,
  createdAt,
  updatedAt
`;

type AddressDbRow = AddressRow & RowDataPacket;

// `status` is stored as string in schema but legacy callers treated it as a
// boolean — `mapAddress` coerces with `Boolean(row.status)` to match that.
interface MappedAddress extends Omit<Address, "status"> {
  _id: Id;
  status: boolean;
}

function mapAddress(row: AddressDbRow | undefined): MappedAddress | null {
  if (!row) {
    return null;
  }

  return {
    ...row,
    _id: row.id,
    status: Boolean(row.status),
    isDefault: Boolean(row.isDefault),
  };
}

export async function listAddressesByUserId(userId: Id): Promise<MappedAddress[]> {
  const rows = await query<AddressDbRow>(
    `SELECT ${ADDRESS_SELECT}
     FROM Addresses
     WHERE userId = :userId
     ORDER BY isDefault DESC, createdAt DESC`,
    { userId }
  );

  return rows.map((r) => mapAddress(r) as MappedAddress);
}

export async function findAddressByIdForUser(
  id: Id,
  userId: Id
): Promise<MappedAddress | null> {
  const rows = await query<AddressDbRow>(
    `SELECT ${ADDRESS_SELECT}
     FROM Addresses
     WHERE id = :id AND userId = :userId
     LIMIT 1`,
    { id, userId }
  );

  return mapAddress(rows[0]);
}

export async function clearDefaultAddresses(userId: Id): Promise<void> {
  await execute(
    `UPDATE Addresses
     SET isDefault = 0, updatedAt = NOW()
     WHERE userId = :userId`,
    { userId }
  );
}

export type CreateAddressPayload = Omit<
  AddressRow,
  "id" | "createdAt" | "updatedAt" | "isDefault" | "status"
> & {
  status?: boolean | string | number;
  isDefault?: boolean | number;
};

export async function createAddress(
  payload: CreateAddressPayload
): Promise<MappedAddress | null> {
  const result = await execute(
    `INSERT INTO Addresses (
      name,
      mobile,
      pincode,
      flatHouse,
      areaStreet,
      landmark,
      townCity,
      state,
      country,
      status,
      isDefault,
      userId,
      createdAt,
      updatedAt
    ) VALUES (
      :name,
      :mobile,
      :pincode,
      :flatHouse,
      :areaStreet,
      :landmark,
      :townCity,
      :state,
      :country,
      :status,
      :isDefault,
      :userId,
      NOW(),
      NOW()
    )`,
    {
      ...(payload as unknown as Record<string, unknown>),
      status: payload.status ?? true,
      isDefault: payload.isDefault ? 1 : 0,
    }
  );

  return findAddressByIdForUser(result.insertId, payload.userId);
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export async function updateAddressForUser(
  id: Id,
  userId: Id,
  payload: UpdateAddressPayload
): Promise<MappedAddress | null> {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return findAddressByIdForUser(id, userId);
  }

  const setClause = entries
    .map(([key]) => `\`${key}\` = :${key}`)
    .join(", ");

  await execute(
    `UPDATE Addresses
     SET ${setClause}, updatedAt = NOW()
     WHERE id = :id AND userId = :userId`,
    {
      id,
      userId,
      ...Object.fromEntries(entries),
    }
  );

  return findAddressByIdForUser(id, userId);
}

export async function deleteAddressForUser(id: Id, userId: Id): Promise<boolean> {
  const result = await execute(
    `DELETE FROM Addresses
     WHERE id = :id AND userId = :userId`,
    { id, userId }
  );

  return result.affectedRows > 0;
}
