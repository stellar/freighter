// These props are accessed whenever react-devtools is used.
// We need to bypass them, otherwise it'll explode with an exception.
const SKIPPING_PROPS = [
  "_reactFragment",
  "@@toStringTag",
  "$$typeof",
  "asymmetricMatch",
  "prototype",
];

/**
 * Build a struct object.
 * It raises an exception whenever a property that hasn't been registered
 * is requested.
 *
 * @param  {Object} mapping Any object.
 * @return {Proxy}          The dict proxy object.
 */
export function Struct<T>(mapping: object): T {
  const proxy = new Proxy(mapping, {
    get(target: any, name: string) {
      if (name === "toJSON") {
        return () => target;
      }

      if (name in target) {
        return target[name];
      }

      if (SKIPPING_PROPS.includes(name) || name.constructor === Symbol) {
        return target[name];
      }

      throw new Error(
        `[Struct] Tried to access missing property name: ${name.toString()}, object is ${JSON.stringify(
          target,
        )}`,
      );
    },

    set(_: any, name: string) {
      throw new Error(`[Struct] Cannot set property: ${name}}`);
    },
  });

  return proxy;
}
