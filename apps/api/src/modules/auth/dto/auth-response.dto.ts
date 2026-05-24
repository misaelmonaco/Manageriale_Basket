import { ApiProperty } from "@nestjs/swagger";
import { ProfileAssignmentStatus, Role } from "@prisma/client";

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  organizationId!: string | null;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  refreshToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ required: false, nullable: true })
  profileAssignment?: {
    assignedToOrganization: boolean;
    assignmentStatus: ProfileAssignmentStatus;
    organizationSlug: string | null;
  };
}
