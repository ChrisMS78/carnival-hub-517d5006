import type { Tables, Database } from './siteTypes';

type Result<T> = { data: T | null; error: Error | null };
type Table = keyof Database['public']['Tables'];
type Role = 'admin' | 'redakteur' | 'user';
export type Account = { id: string; email: string; display_name: string | null; role: Role };

async function call<T>(action: string, body: unknown = {}): Promise<Result<T>> {
  try {
    const form = body instanceof FormData;
    const response = await fetch('/api/index.php?action=' + encodeURIComponent(action), {
      method: 'POST', credentials: 'same-origin',
      headers: { 'X-KEB-Request': '1', ...(form ? {} : { 'Content-Type': 'application/json' }) },
      body: form ? body : JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || result.error) throw new Error(result.error?.message || 'Serverfehler (' + response.status + ')');
    return { data: result.data as T, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error('Verbindung fehlgeschlagen') };
  }
}

class Query<T> implements PromiseLike<Result<T>> {
  constructor(private q: Record<string, unknown>) {}
  private next<U = T>(patch: Record<string, unknown>): Query<U> { return new Query<U>({ ...this.q, ...patch }); }
  select(columns = '*') { return this.next({ op: 'select', columns }); }
  insert(values: unknown) { return this.next({ op: 'insert', values }); }
  update(values: unknown) { return this.next({ op: 'update', values }); }
  delete() { return this.next({ op: 'delete' }); }
  eq(field: string, value: unknown) { return this.next({ filters: [...(this.q.filters as unknown[] || []), { field, value, kind: 'eq' }] }); }
  in(field: string, value: unknown[]) { return this.next({ filters: [...(this.q.filters as unknown[] || []), { field, value, kind: 'in' }] }); }
  order(field: string, options: { ascending?: boolean } = {}) { return this.next({ orders: [...(this.q.orders as unknown[] || []), { field, ascending: options.ascending ?? true }] }); }
  limit(limit: number) { return this.next({ limit }); }
  single() { return this.next<T extends (infer R)[] ? R : T>({ single: 'required' }); }
  maybeSingle() { return this.next<T extends (infer R)[] ? R : T>({ single: 'optional' }); }
  then<TResult1 = Result<T>, TResult2 = never>(onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    return call<T>('query', this.q).then(onfulfilled, onrejected);
  }
}

const urls = new Map<string, string>();
export const siteApi = {
  from<K extends Table>(table: K) { return new Query<Tables<K>[]>({ table, op: 'select' }); },
  login(email: string, password: string) { return call<Account>('login', { email, password }); },
  me() { return call<Account>('me'); },
  logout() { return call<null>('logout'); },
  createUser(data: { email: string; password: string; display_name: string; role: Role }) { return call<Account>('create-user', data); },
  changePassword(userId: string, newPassword: string) { return call<{ error?: string }>('password', { userId, newPassword }); },
  rebuildThumbnail(id: string) { return call<{id: string; thumbnail_url: string}>('rebuild-thumbnail', { id }); },
  albumUpload(albumId: string, file: File) {
    const f = new FormData(); f.append('albumId', albumId); f.append('file', file);
    return call<Tables<'gallery_images'>>('album-upload', f);
  },
  storage: {
    from(bucket: string) {
      return {
        async upload(name: string, file: File) {
          const f = new FormData(); f.append('bucket', bucket); f.append('name', name); f.append('file', file);
          const result = await call<{url: string}>('upload', f);
          if (result.data) urls.set(bucket + ':' + name, result.data.url);
          return result;
        },
        getPublicUrl(name: string) { return { data: { publicUrl: urls.get(bucket + ':' + name) || '' } }; },
      };
    },
  },
};
