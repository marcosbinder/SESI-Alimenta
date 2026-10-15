/**
 * Cliente HTTP centralizado da aplicação.
 * Injeta credenciais de sessão automaticamente, trata falhas de rede da intranet
 * e intercepta respostas 401 para redirecionar o usuário ao login se a sessão expirar.
 */

export const api = async (endpoint, options = {}) => {
  const opts = options || {};

  const headers = {
    ...(!(opts.body instanceof FormData) && { 'Content-Type': 'application/json' }),
    ...opts.headers,
  };

  const config = {
    ...opts,
    credentials: 'include',
    headers,
  };

  try {
    const response = await fetch(endpoint, config);


    if (response.status === 401 && !endpoint.includes('login')) {
      console.warn('[Security] Token inválido, expirado ou revogado. Ejetando sessão.');
      localStorage.clear();
      window.location.href = '/login';
      return { sucesso: false, erro: 'Sessão expirada. Faça login novamente.' };
    }


    if (response.status === 204) {
      return { sucesso: true };
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { 
        sucesso: false, 
        erro: data?.erro || 'Ocorreu um erro ao processar a requisição.', 
        status: response.status,
        ...data
      };
    }


    return data || { sucesso: true };

  } catch (error) {

    console.error('[Network Error] Instabilidade de conexão na API:', error);
    return { sucesso: false, erro: 'Instabilidade na rede local. Tente novamente em alguns segundos.' };
  }
};
