import type { PapelUsuario } from "../types/user";

export class UserModel {
  id: string;
  nome: string;
  username: string;
  avatarUrl: string | null;
  email: string;
  senha: string;
  papel: PapelUsuario;
  criadoEm: Date;

  constructor(data: {
    id: string;
    nome: string;
    username: string;
    avatarUrl?: string | null;
    email: string;
    senha: string;
    papel?: PapelUsuario;
    criadoEm?: Date;
  }) {
    this.id = data.id;
    this.nome = data.nome;
    this.username = data.username;
    this.avatarUrl = data.avatarUrl ?? null;
    this.email = data.email;
    this.senha = data.senha;
    this.papel = data.papel ?? "CLIENTE";
    this.criadoEm = data.criadoEm ?? new Date();
  }

  static fromPrisma(data: {
    id: string;
    nome: string;
    username: string;
    avatarUrl: string | null;
    email: string;
    senha: string;
    papel: PapelUsuario;
    criadoEm: Date;
  }): UserModel {
    return new UserModel(data);
  }

  toPrisma() {
    return {
      id: this.id,
      nome: this.nome,
      username: this.username,
      avatarUrl: this.avatarUrl,
      email: this.email,
      senha: this.senha,
      papel: this.papel,
      criadoEm: this.criadoEm,
    };
  }
}
