import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
    @IsString()
    @IsNotEmpty()
    p256dh: string;

    @IsString()
    @IsNotEmpty()
    auth: string;
}

export class SubscribeDto {
    @IsString()
    @IsNotEmpty()
    endpoint: string;

    @IsObject()
    @ValidateNested()
    @Type(() => PushKeysDto)
    keys: PushKeysDto;

    @IsOptional()
    @IsString()
    userId?: string;
}

export class SendNotificationDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    body: string;

    @IsOptional()
    @IsString()
    icon?: string;

    @IsOptional()
    @IsString()
    url?: string;

    @IsOptional()
    @IsString()
    tag?: string;
}
