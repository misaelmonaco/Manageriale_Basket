import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { RateLimit } from "../../shared/throttling/rate-limit.decorator";
import { AuthService } from "./auth.service";
import { AuthResponseDto, RegisterResponseDto } from "./dto/auth-response.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { RequestPasswordResetDto } from "./dto/request-password-reset.dto";
import { ResendVerificationDto } from "./dto/resend-verification.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateOwnPasswordDto } from "./dto/update-own-password.dto";
import { UpdateUserPasswordDto } from "./dto/update-user-password.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit({ limit: 5, windowSeconds: 3600 })
  @Post("register")
  @ApiOperation({
    summary: "Register the first SUPER_ADMIN or a new organization director",
  })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 300, perEmail: true })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Authenticate with email and password" })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid credentials" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @RateLimit({ limit: 20, windowSeconds: 300 })
  @Get("verify-email")
  @ApiOperation({ summary: "Verify a registered email address" })
  verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @RateLimit({ limit: 3, windowSeconds: 900, perEmail: true })
  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend the email verification link" })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Public()
  @RateLimit({ limit: 3, windowSeconds: 900, perEmail: true })
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Send a password reset link" })
  @ApiOkResponse({ schema: { example: { success: true } } })
  forgotPassword(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @RateLimit({ limit: 10, windowSeconds: 900 })
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Set a new password from a reset link" })
  @ApiOkResponse({ schema: { example: { success: true } } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @RateLimit({ limit: 30, windowSeconds: 300 })
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

  @RateLimit({ limit: 5, windowSeconds: 900 })
  @Patch("me/password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update the current user password" })
  updateOwnPassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateOwnPasswordDto,
  ) {
    return this.authService.updateOwnPassword(
      user.sub,
      dto.currentPassword,
      dto.password,
    );
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
