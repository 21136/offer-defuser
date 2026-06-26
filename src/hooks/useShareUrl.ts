import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { decodeShareParams } from '../utils/shareUrl';

/**
 * 从 URL query 解析分享参数
 * 用于 ResultPage 渲染
 */
export function useShareUrl() {
  const [searchParams] = useSearchParams();

  return useMemo(() => decodeShareParams(searchParams), [searchParams]);
}
