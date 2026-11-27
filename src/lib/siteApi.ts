import type { Tables, Database } from './siteTypes';

type Result<T> = { data: T | null; error: Error | null };
type Table = keyof Database['public']['Tables'];
export type TrashItem = { table: string; id: string; label: string; deleted_at: string; last_edit_by: string | null };
export type AuditItem = { id: number; actor: string; action: string; entity: string; entity_id: string; label: string; fields: string; created_at: string };
export type LegalStatus = { impressum: Record<string,string>; datenschutz: Record<string,string> };
type Role = 'admin' | 'redakteur' | 'user';
export type Account = { id: string; email: string; display_name: string | null; username: string; role: Role };

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
  upcoming() { return this.next({ upcoming: true }); }
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
  adminFrom<K extends Table>(table: K) { return new Query<Tables<K>[]>({ table, op: 'select', management: true }); },
  legalStatus() { return call<LegalStatus>('legal-status'); },
  saveLegal(category: 'impressum' | 'datenschutz', values: Record<string,string>) { return call<LegalStatus>('legal-save', { category, values }); },
  dashboard() { return call<Record<string, number>>('dashboard'); },
  trash() { return call<TrashItem[]>('trash'); },
  restore(table: string, id: string) { return call<null>('restore', { table, id }); },
  purge(table: string, id: string) { return call<null>('purge', { table, id }); },
  audit() { return call<AuditItem[]>('audit'); },
  ownPassword(currentPassword: string, newPassword: string, confirmation: string) { return call<null>('own-password', { currentPassword, newPassword, confirmation }); },
  login(identifier: string, password: string) { return call<Account>('login', { identifier, password }); },
  me() { return call<Account>('me'); },
  logout() { return call<null>('logout'); },
  createUser(data: { email: string; password: string; password_confirmation: string; username: string; role: Role }) { return call<Account>('create-user', data); },
  deleteUser(id: string) { return call<null>('delete-user', { id }); },
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
