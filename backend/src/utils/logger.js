const serializeError = (error) => ({
  name: error?.name,
  message: error?.message,
  code: error?.code,
  stack: error?.stack,
});

const write = (level, message, metadata = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  };

  const output = JSON.stringify(entry);

  if (level === "error") {
    console.error(output);
    return;
  }

  if (level === "warn") {
    console.warn(output);
    return;
  }

  console.log(output);
};

const logger = {
  info: (message, metadata) => write("info", message, metadata),
  warn: (message, metadata) => write("warn", message, metadata),
  error: (message, metadata = {}) => {
    const safeMetadata = { ...metadata };

    if (safeMetadata.error instanceof Error) {
      safeMetadata.error = serializeError(safeMetadata.error);
    }

    write("error", message, safeMetadata);
  },
};

export default logger;
