const common = {
  appName: 'Radio Log',
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  create: 'Create',
  search: 'Search',
  filter: 'Filter',
  confirm: 'Confirm',
  yes: 'Yes',
  no: 'No',
  error: 'Error',
  success: 'Success',
  placeholder: {
    callsign: 'e.g. W1AW',
    freq: 'e.g. 14.175',
    gridSquare: 'e.g. OM89',
    qth: 'e.g. Shanghai',
    serialNumber: 'e.g. SN12345',
    notes: 'Optional notes...',
    name: 'e.g. IC-7300',
    manufacturer: 'e.g. Icom',
    model: 'e.g. IC-7300',
  },
  unit: {
    mhz: 'MHz',
    watts: 'Watts',
  },
  select: {
    band: 'Select band',
    mode: 'Select mode',
    type: 'Select type',
  },
} as const;

export default common;
