import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, type User } from "../../db/schema";

// Repository: HANYA bertanggung jawab pada query database
export class AuthRepository {
  async findByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async findById(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }
}
