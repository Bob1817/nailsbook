import { ValidationPipe } from '@nestjs/common';
import { CreateClientMessageDto } from '../client-messages/dto/create-client-message.dto';
import { CreateTechnicianMessageDto } from '../technician-messages/dto/create-technician-message.dto';

describe.each([CreateClientMessageDto, CreateTechnicianMessageDto])('message payload %p', (metatype) => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  it('preserves legacy snake case conversation IDs', async () => {
    const dto = await pipe.transform({ conversation_id: 9, messageType: 'image', imageUrl: '/uploads/a.jpg' }, { type: 'body', metatype });
    expect(dto.conversationId).toBe(9);
  });
  it('preserves new-conversation recipients and legacy image fields', async () => {
    const key = metatype === CreateClientMessageDto ? 'tech_id' : 'client_id';
    const property = metatype === CreateClientMessageDto ? 'techId' : 'clientId';
    const dto = await pipe.transform({ [key]: '7', message_type: 'image', image_url: '/uploads/a.jpg' }, { type: 'body', metatype });
    expect(dto[property]).toBe(7);
    expect(dto.messageType).toBe('image');
    expect(dto.imageUrl).toBe('/uploads/a.jpg');
  });
  it('rejects invalid conversation IDs', async () => {
    await expect(pipe.transform({ conversation_id: -1, messageType: 'image' }, { type: 'body', metatype })).rejects.toThrow();
  });
  it('accepts canonical image payloads', async () => {
    const dto = await pipe.transform({ conversationId: 9, messageType: 'image', imageUrl: '/uploads/a.jpg' }, { type: 'body', metatype });
    expect(dto.conversationId).toBe(9);
    expect(dto.imageUrl).toBe('/uploads/a.jpg');
  });
});
