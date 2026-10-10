import type { Papel, Usuario } from "@prisma/client";

export class UserModel {
  readonly id: string;
  nome: string;
  username: string;
  avatarUrl: string | null;
  email: string;
  senha: string;
  papel: Papel;
  readonly criadoEm: Date;

  constructor(data: Usuario) {
    this.id = data.id;
    this.nome = data.nome;
    this.username = data.username;
    this.avatarUrl = data.avatarUrl;
    this.email = data.email;
    this.senha = data.senha;
    this.papel = data.papel;
    this.criadoEm = data.criadoEm;
  }

  static fromPrisma(data: Usuario): UserModel {
    return new UserModel(data);
  }
}
