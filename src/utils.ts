import fs from 'fs';
import path from 'path';
export const isFunction = (arg: unknown): arg is (...args: any[]) => any =>
  typeof arg === 'function';

export const isRegExp = (arg: unknown): arg is RegExp =>
  Object.prototype.toString.call(arg) === '[object RegExp]';

/*
 * Read all files in the specified folder, filter through regular rules, and return file path array
 * @param root Specify the folder path
 * [@param] reg Regular expression for filtering files, optional parameters
 * Note: It can also be deformed to check whether the file path conforms to regular rules. The path can be a folder or a file. The path that does not exist is also fault-tolerant.
 */
export function readAllFile(root: string, reg?: RegExp) {
  let resultArr: string[] = [];
  try {
    if (fs.existsSync(root)) {
      const stat = fs.lstatSync(root);
      if (stat.isDirectory()) {
        // dir
        const files = fs.readdirSync(root);
        files.forEach(function (file) {
          const t = readAllFile(path.join(root, '/', file), reg);
          resultArr = resultArr.concat(t);
        });
      } else {
        if (reg !== undefined) {
          if (isFunction(reg.test) && reg.test(root)) {
            resultArr.push(root);
          }
        } else {
          resultArr.push(root);
        }
      }
    }
  } catch (error) {}

  return resultArr;
}
