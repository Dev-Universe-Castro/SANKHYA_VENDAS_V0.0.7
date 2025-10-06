
import axios from 'axios';

// Serviço de gerenciamento de funis
export interface Funil {
  CODFUNIL: string
  NOME: string
  DESCRICAO: string
  COR: string
  ATIVO: string
  DATA_CRIACAO: string
  DATA_ATUALIZACAO: string
}

export interface EstagioFunil {
  CODESTAGIO: string
  CODFUNIL: string
  NOME: string
  ORDEM: number
  COR: string
  ATIVO: string
}

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

const LOGIN_HEADERS = {
  'token': "c3744c65-acd9-4d36-aa35-49ecb13aa774",
  'appkey': "79bf09c7-7aa9-4ac6-b8a4-0c3aa7acfcae",
  'username': "renan.silva@sankhya.com.br",
  'password': "Integracao123!"
};

let cachedToken: string | null = null;

async function obterToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const resposta = await axios.post(ENDPOINT_LOGIN, {}, {
      headers: LOGIN_HEADERS,
      timeout: 10000
    });

    const token = resposta.data.bearerToken || resposta.data.token;

    if (!token) {
      throw new Error("Token não encontrado na resposta de login.");
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    cachedToken = null;
    throw new Error(`Falha na autenticação Sankhya: ${erro.message}`);
  }
}

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}) {
  const token = await obterToken();

  try {
    const config = {
      method: method.toLowerCase(),
      url: fullUrl,
      data: data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const resposta = await axios(config);
    return resposta.data;

  } catch (erro: any) {
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;
      throw new Error("Sessão expirada. Tente novamente.");
    }

    const errorDetails = erro.response?.data || erro.message;
    throw new Error(`Falha na comunicação com a API Sankhya: ${JSON.stringify(errorDetails)}`);
  }
}

function mapearEntidades(entities: any, primaryKey: string): any[] {
  if (!entities || !entities.entity) {
    return [];
  }

  const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
  const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

  return entityArray.map((rawEntity: any) => {
    const cleanObject: any = {};

    if (rawEntity.$) {
      cleanObject[primaryKey] = rawEntity.$[primaryKey] || "";
    }

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];

      if (rawEntity[fieldKey]) {
        cleanObject[fieldName] = rawEntity[fieldKey].$;
      }
    }

    return cleanObject;
  });
}

// CONSULTAR FUNIS
export async function consultarFunis(): Promise<Funil[]> {
  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "AD_FUNIS",
        "includePresentationFields": "S",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "NOME, DESCRICAO, COR, ATIVO, DATA_CRIACAO, DATA_ATUALIZACAO"
          }
        },
        "criteria": {
          "expression": {
            "$": "ATIVO = 'S'"
          }
        }
      }
    }
  };

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_CONSULTA_SERVICO, 'POST', PAYLOAD);
    
    if (!resposta?.responseBody?.entities) {
      return [];
    }

    return mapearEntidades(resposta.responseBody.entities, 'CODFUNIL') as Funil[];
  } catch (erro) {
    console.error("❌ Erro ao consultar funis:", erro);
    return [];
  }
}

// CONSULTAR ESTÁGIOS DE UM FUNIL
export async function consultarEstagiosFunil(codFunil: string): Promise<EstagioFunil[]> {
  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "AD_FUNIS_ESTAGIOS",
        "includePresentationFields": "S",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "CODFUNIL, NOME, ORDEM, COR, ATIVO"
          }
        },
        "criteria": {
          "expression": {
            "$": `CODFUNIL = ${codFunil} AND ATIVO = 'S'`
          }
        },
        "orderBy": {
          "ORDEM": "ASC"
        }
      }
    }
  };

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_CONSULTA_SERVICO, 'POST', PAYLOAD);
    
    if (!resposta?.responseBody?.entities) {
      return [];
    }

    return mapearEntidades(resposta.responseBody.entities, 'CODESTAGIO') as EstagioFunil[];
  } catch (erro) {
    console.error("❌ Erro ao consultar estágios do funil:", erro);
    return [];
  }
}

// SALVAR FUNIL
export async function salvarFunil(funil: Partial<Funil>): Promise<Funil> {
  const isUpdate = !!funil.CODFUNIL;
  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  const currentDate = formatarData(new Date().toISOString().split('T')[0]);

  let fields: string[];
  let values: Record<string, any>;
  let record: any;

  if (isUpdate) {
    fields = ["NOME", "DESCRICAO", "COR", "DATA_ATUALIZACAO"];
    values = {
      "0": funil.NOME || "",
      "1": funil.DESCRICAO || "",
      "2": funil.COR || "#3b82f6",
      "3": currentDate
    };
    record = {
      pk: { CODFUNIL: String(funil.CODFUNIL) },
      values: values
    };
  } else {
    fields = ["NOME", "DESCRICAO", "COR", "ATIVO", "DATA_CRIACAO", "DATA_ATUALIZACAO"];
    values = {
      "0": funil.NOME || "",
      "1": funil.DESCRICAO || "",
      "2": funil.COR || "#3b82f6",
      "3": "S",
      "4": currentDate,
      "5": currentDate
    };
    record = { values: values };
  }

  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_FUNIS",
      "standAlone": false,
      "fields": fields,
      "records": [record]
    }
  };

  const resposta = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);
  const funis = await consultarFunis();
  return isUpdate ? funis.find(f => f.CODFUNIL === funil.CODFUNIL)! : funis[funis.length - 1];
}

// SALVAR ESTÁGIO
export async function salvarEstagio(estagio: Partial<EstagioFunil>): Promise<EstagioFunil> {
  const isUpdate = !!estagio.CODESTAGIO;

  let fields: string[];
  let values: Record<string, any>;
  let record: any;

  if (isUpdate) {
    fields = ["NOME", "ORDEM", "COR"];
    values = {
      "0": estagio.NOME || "",
      "1": String(estagio.ORDEM || 0),
      "2": estagio.COR || "#3b82f6"
    };
    record = {
      pk: { CODESTAGIO: String(estagio.CODESTAGIO) },
      values: values
    };
  } else {
    fields = ["CODFUNIL", "NOME", "ORDEM", "COR", "ATIVO"];
    values = {
      "0": String(estagio.CODFUNIL || ""),
      "1": estagio.NOME || "",
      "2": String(estagio.ORDEM || 0),
      "3": estagio.COR || "#3b82f6",
      "4": "S"
    };
    record = { values: values };
  }

  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_FUNIS_ESTAGIOS",
      "standAlone": false,
      "fields": fields,
      "records": [record]
    }
  };

  await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);
  const estagios = await consultarEstagiosFunil(String(estagio.CODFUNIL));
  return isUpdate ? estagios.find(e => e.CODESTAGIO === estagio.CODESTAGIO)! : estagios[estagios.length - 1];
}

// DELETAR FUNIL (soft delete)
export async function deletarFunil(codFunil: string): Promise<void> {
  const formatarData = (dataISO: string) => {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  };
  const currentDate = formatarData(new Date().toISOString().split('T')[0]);

  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_FUNIS",
      "standAlone": false,
      "fields": ["ATIVO", "DATA_ATUALIZACAO"],
      "records": [{
        pk: { CODFUNIL: String(codFunil) },
        values: { "0": "N", "1": currentDate }
      }]
    }
  };

  await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);
}

// DELETAR ESTÁGIO (soft delete)
export async function deletarEstagio(codEstagio: string): Promise<void> {
  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "AD_FUNIS_ESTAGIOS",
      "standAlone": false,
      "fields": ["ATIVO"],
      "records": [{
        pk: { CODESTAGIO: String(codEstagio) },
        values: { "0": "N" }
      }]
    }
  };

  await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);
}
