import assert from "node:assert/strict";
import test from "node:test";
import { likeRepository } from "../src/modules/like/like.repository.js";
import { likeService } from "../src/modules/like/like.service.js";
import { likePostParamsSchema } from "../src/modules/like/like.schema.js";

test("좋아요 경로의 게시글 ID를 숫자로 검증한다", () => {
  assert.equal(likePostParamsSchema.parse({ postId: "12" }).postId, 12);
  assert.equal(likePostParamsSchema.safeParse({ postId: "abc" }).success, false);
  assert.equal(likePostParamsSchema.safeParse({ postId: "0" }).success, false);
});

test("조회 가능한 게시글이면 현재 사용자 좋아요를 등록한다", async () => {
  const originalPostExists = likeRepository.postExists;
  const originalAddLike = likeRepository.addLike;
  const calls: unknown[][] = [];

  likeRepository.postExists = async () => true;
  likeRepository.addLike = async (...args) => { calls.push(args); };

  try {
    await likeService.likePost(12, "user-1", {} as never);
    assert.deepEqual(calls, [[12, "user-1", {}]]);
  } finally {
    likeRepository.postExists = originalPostExists;
    likeRepository.addLike = originalAddLike;
  }
});

test("조회할 수 없는 게시글에는 좋아요를 등록하지 않는다", async () => {
  const originalPostExists = likeRepository.postExists;
  const originalAddLike = likeRepository.addLike;
  let addLikeCalled = false;

  likeRepository.postExists = async () => false;
  likeRepository.addLike = async () => { addLikeCalled = true; };

  try {
    await assert.rejects(
      likeService.likePost(12, "user-1", {} as never),
      (error: unknown) => error instanceof Error && error.message === "게시글을 찾을 수 없습니다."
    );
    assert.equal(addLikeCalled, false);
  } finally {
    likeRepository.postExists = originalPostExists;
    likeRepository.addLike = originalAddLike;
  }
});
