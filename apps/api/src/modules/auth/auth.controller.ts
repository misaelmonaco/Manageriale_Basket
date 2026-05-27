import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { Public } from "../../shared/auth/public.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { Roles } from "../../shared/rbac/roles.decorator";
import { AuthService } from "./auth.service";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { UpdateUserPasswordDto } from "./dto/update-user-password.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  @ApiOperation({
    summary: "Register the first SUPER_ADMIN or a new organization director",
  })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate with email and password" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Rotate a valid refresh token and issue a new token pair",
  })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Revoke active refresh tokens for the current user",
  })
  @ApiOkResponse({ schema: { example: { success: true } } })
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Return the authenticated user profile" })
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.sub);
  }

  @Patch("me/password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current user password" })
  updateOwnPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.authService.updateOwnPassword(user.sub, dto.password);
  }

  @Patch("users/:id/password")
  @ApiBearerAuth()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  @ApiOperation({
    summary: "Update a user password inside the selected organization",
  })
  updateUserPassword(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateUserPasswordDto,
  ) {
    return this.authService.updateUserPassword(
      user,
      id,
      dto.password,
      dto.organizationSlug,
    );
  }
}
