import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * 密码强度要求：
 * - 至少 8 位
 * - 必须同时包含字母和数字
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          if (value.length < 8) return false;
          if (!/[a-zA-Z]/.test(value)) return false;
          if (!/[0-9]/.test(value)) return false;
          return true;
        },
        defaultMessage(_args: ValidationArguments) {
          return '密码至少 8 位，需同时包含字母和数字';
        },
      },
    });
  };
}
