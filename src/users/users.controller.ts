import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { SetRoleDto } from './dto/set-role.dto';

interface RequestWithUser extends Request {
  user: { userId: string; email: string };
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('set-role')
  async setRole(@Req() req: RequestWithUser, @Body() setRoleDto: SetRoleDto) {
    return this.usersService.setRole(req.user.userId, setRoleDto);
  }
}
