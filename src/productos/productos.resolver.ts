import { Resolver, Query, Args, Int, Float } from '@nestjs/graphql';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Producto } from './producto.model.js';

const API_URL = 'https://nestjs-productos-api.onrender.com/api/v1/productos';

@Resolver(() => Producto)
export class ProductosResolver {
  constructor(private readonly http: HttpService) {}

  @Query(() => [Producto])
  async productos(): Promise<Producto[]> {
    const { data } = await firstValueFrom(this.http.get<Producto[]>(API_URL));
    return data;
  }

  @Query(() => Producto, { nullable: true })
  async productoPorId(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<Producto | undefined> {
    const { data } = await firstValueFrom(this.http.get<Producto>(`${API_URL}/${id}`));
    return data;
  }

  @Query(() => [Producto])
  async productosBaratos(
    @Args('precioMaximo', { type: () => Float }) precioMaximo: number,
  ): Promise<Producto[]> {
    const { data } = await firstValueFrom(this.http.get<Producto[]>(API_URL));
    return data.filter((p) => p.precio <= precioMaximo);
  }
}
