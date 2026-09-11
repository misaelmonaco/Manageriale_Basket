import { IsEmail } from "class-validator";

export class MailTestDto {
  @IsEmail()
  to!: string;
}
