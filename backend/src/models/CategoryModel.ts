import { PrismaClient, type Categoria } from "@prisma/client";
import prisma from "../config/prisma";

export class CategoryModel {
  private prismaClient: PrismaClient;

  constructor(prismaClient: PrismaClient = prisma) {
    this.prismaClient = prismaClient;
  }

  async findAll(): Promise<Categoria[]> {
    return this.prismaClient.categoria.findMany({ orderBy: { nome: "asc" } });
  }
}
