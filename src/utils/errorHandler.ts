import Toast from 'react-native-toast-message';

/**
 * Função para tratar erros de forma padronizada na aplicação
 * @param error O erro capturado
 * @param customMessage Mensagem personalizada opcional
 * @param silent Se verdadeiro, não exibe toast (apenas loga o erro)
 */
export const handleError = (error: any, customMessage?: string, silent: boolean = false): void => {
  console.error('Error caught:', error);

  if (silent) return;

  let title = 'Erro';
  let message = customMessage || 'Ocorreu um erro inesperado.';

  if (error?.message?.includes('network') || error?.message?.includes('fetch') || error?.code === 'NETWORK_ERROR') {
    title = 'Erro de Conexão';
    message = 'Verifique sua conexão com a internet e tente novamente.';
  } else if (error?.status === 401 || error?.statusCode === 401 || error?.message?.includes('unauthorized')) {
    title = 'Não Autorizado';
    message = 'Sua sessão expirou ou você não tem permissão para esta ação.';
  } else if (error?.status === 404 || error?.statusCode === 404) {
    title = 'Não Encontrado';
    message = 'O recurso solicitado não foi encontrado.';
  } else if (error?.status === 500 || (error?.status && error.status >= 500)) {
    title = 'Erro do Servidor';
    message = 'Ocorreu um erro no servidor. Tente novamente mais tarde.';
  } else if (error?.status === 0 || error?.status === 'ECONNREFUSED') {
    title = 'Serviço Indisponível';
    message = 'O serviço está temporariamente indisponível. Tente novamente em alguns instantes.';
  } else if (error?.message) {
    message = error.message;
  }

  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
  });
};

/**
 * Wrapper para funções assíncronas que podem lançar erros
 * @param fn Função assíncrona a ser executada
 * @param errorMessage Mensagem de erro personalizada opcional
 * @param silent Se verdadeiro, não exibe toast (apenas loga o erro)
 * @returns Resultado da função ou undefined em caso de erro
 */
export const tryCatch = async <T>(
  fn: () => Promise<T>,
  errorMessage?: string,
  silent: boolean = false
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error) {
    handleError(error, errorMessage, silent);
    return undefined;
  }
};

/**
 * Wrapper para funções síncronas que podem lançar erros
 * @param fn Função síncrona a ser executada
 * @param errorMessage Mensagem de erro personalizada opcional
 * @param silent Se verdadeiro, não exibe toast (apenas loga o erro)
 * @returns Resultado da função ou undefined em caso de erro
 */
export const tryCatchSync = <T>(
  fn: () => T,
  errorMessage?: string,
  silent: boolean = false
): T | undefined => {
  try {
    return fn();
  } catch (error) {
    handleError(error, errorMessage, silent);
    return undefined;
  }
}; 