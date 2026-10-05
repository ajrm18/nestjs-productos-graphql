import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

@ObjectType()
export class Producto {
  @Field(() => Int)
  id: number;

  @Field()
  nombre: string;

  @Field(() => Float)
  precio: number;
}
