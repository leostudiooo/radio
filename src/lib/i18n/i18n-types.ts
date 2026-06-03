export const locales = ['en', 'zh'] as const;

export type Locale = (typeof locales)[number];

export type ValidationMessages = {
  INVALID_FORMAT?: string;
  REQUIRED?: string;
  INVALID_BAND?: string;
  INVALID_RST?: string;
};

export type BaseTranslation = {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    confirm: string;
    yes: string;
    no: string;
    error: string;
    success: string;
  };
  nav: {
    qsoLog: string;
    equipment: string;
    qsl: string;
    settings: string;
    logout: string;
  };
  auth: {
    login: string;
    logout: string;
    signInWithWebAuthn: string;
    signInWithGitHub: string;
    signInWithMagicLink: string;
    emailPlaceholder: string;
    sendMagicLink: string;
    profile: string;
  };
  qso: {
    title: string;
    newQSO: string;
    callsign: string;
    date: string;
    time: string;
    band: string;
    freq: string;
    mode: string;
    rstSent: string;
    rstRcvd: string;
    name: string;
    qth: string;
    gridSquare: string;
    comment: string;
    power: string;
    eyeball: string;
    eyeballDescription: string;
    required: string;
    invalidCallsign: string;
    invalidBand: string;
    invalidRST: string;
    validation: {
      callsign: { INVALID_FORMAT?: string; REQUIRED?: string };
      band: { INVALID_BAND?: string; REQUIRED?: string };
      freq: { INVALID_FORMAT?: string };
      rst: { INVALID_RST?: string; REQUIRED?: string };
      gridSquare: { INVALID_FORMAT?: string };
      qsoDate: { REQUIRED?: string };
      timeOn: { REQUIRED?: string };
    };
  };
  adif: {
    import: string;
    export: string;
    importDescription: string;
    exportDescription: string;
    uploadFile: string;
    downloadFile: string;
    parseError: string;
  };
  equipment: {
    title: string;
    newEquipment: string;
    name: string;
    type: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    description: string;
    active: string;
  };
  qsl: {
    title: string;
    method: string;
    paper: string;
    lotw: string;
    eqsl: string;
    sent: string;
    received: string;
    confirmed: string;
    pending: string;
    status: string;
  };
};

export type Translation = BaseTranslation;

export type TranslationFunctions = Record<Locale, () => Promise<Translation> | Translation>;
