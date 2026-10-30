import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type User = {
  id: string;
};

type UserContextData = {
  user: User | null;
  token: string | null;
};

const UserContext = createContext<UserContextData>({} as UserContextData);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>({
    id: "usr-cliente-01",
  });
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "lucas.oliveira@email.com", senha: "123456" }),
    })
      .then((res) => res.json())
      .then((dados) => setToken(dados.token))
      .catch((error) => console.error("Erro no login de desenvolvimento:", error));
  }, []);

  return (
    <UserContext.Provider value={{ user, token }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);