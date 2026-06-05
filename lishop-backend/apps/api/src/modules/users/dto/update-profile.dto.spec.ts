import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

async function validateDto<T extends object>(dto: T) {
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe('UpdateProfileDto validation', () => {
  it('accepts uploaded avatar data URLs longer than 500 characters', async () => {
    const avatarUrl = `data:image/png;base64,${'a'.repeat(800)}`;
    const dto = Object.assign(new UpdateProfileDto(), {
      firstName: 'Avatar',
      lastName: 'Tester',
      avatarUrl,
    });

    const errors = await validateDto(dto);

    expect(errors.find((error) => error.property === 'avatarUrl')).toBeUndefined();
  });
});
