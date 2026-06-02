import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';

async function validateDto<T extends object>(dto: T) {
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('Auth DTO validation', () => {
  it('rejects weak registration passwords without complexity', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'customer@example.com',
      password: 'password',
      firstName: 'Linh',
      lastName: 'Nguyen',
    });

    const errors = await validateDto(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects reset passwords without a special character', async () => {
    const dto = Object.assign(new ResetPasswordDto(), {
      token: 'reset-token',
      password: 'Password1',
    });

    const errors = await validateDto(dto);

    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects blank-only customer names', async () => {
    const dto = Object.assign(new RegisterDto(), {
      email: 'customer@example.com',
      password: 'StrongPass1!',
      firstName: '   ',
      lastName: '\t',
    });

    const errors = await validateDto(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['firstName', 'lastName']),
    );
  });
});
