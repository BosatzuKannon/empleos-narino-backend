import { IsIn, IsNotEmpty } from 'class-validator';

export class SetRoleDto {
  @IsIn(['CANDIDATE', 'COMPANY_ADMIN'], {
    message: 'El rol debe ser CANDIDATE o COMPANY_ADMIN.',
  })
  @IsNotEmpty()
  role: 'CANDIDATE' | 'COMPANY_ADMIN';
}
