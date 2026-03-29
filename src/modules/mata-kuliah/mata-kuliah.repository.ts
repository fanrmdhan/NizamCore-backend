import { eq } from "drizzle-orm";
import { db } from "../../db";
import { mataKuliah, type MataKuliah, type NewMataKuliah } from "../../db/schema";

export class MataKuliahRepository {
  async findAll(): Promise<MataKuliah[]> {
    return await db.select().from(mataKuliah).orderBy(mataKuliah.created_at);
  }

  async findById(id: string): Promise<MataKuliah | undefined> {
    const result = await db
      .select()
      .from(mataKuliah)
      .where(eq(mataKuliah.id, id))
      .limit(1);
    return result[0];
  }

  async findByKode(kode: string): Promise<MataKuliah | undefined> {
    const result = await db
      .select()
      .from(mataKuliah)
      .where(eq(mataKuliah.kode, kode))
      .limit(1);
    return result[0];
  }

  async create(
    data: Omit<NewMataKuliah, "id" | "created_at" | "updated_at">
  ): Promise<MataKuliah> {
    const result = await db.insert(mataKuliah).values(data).returning();
    return result[0];
  }

  async update(
    id: string,
    data: Partial<Omit<NewMataKuliah, "id" | "created_at" | "updated_at">>
  ): Promise<MataKuliah | undefined> {
    const result = await db
      .update(mataKuliah)
      .set({ ...data, updated_at: new Date() })
      .where(eq(mataKuliah.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(mataKuliah)
      .where(eq(mataKuliah.id, id))
      .returning();
    return result.length > 0;
  }
}
