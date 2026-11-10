import { javaPropertyEntries } from './java-properties-order.js';
export {
  propertiesForDemoProduct as makePropertyModel,
  serializeForLicenseHash as serializeForSignature,
  escapeJavaProperty
} from './demo-reference-properties.js';

// Preserve the standalone repository's existing serialization API.
export function serializeFinal(header, data) {
  return header + '\n' + javaPropertyEntries(data).filter(([, value]) => value != null)
    .map(([key, value]) => key + '=' + value).join('\n');
}

