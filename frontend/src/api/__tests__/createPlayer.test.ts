import mockAxios from "jest-mock-axios";
import { AxiosError, AxiosResponse } from "axios";
import createPlayer, { Response } from "../createPlayer";

const testPlayer = {
  nickname: "test",
  gameCode: "12345",
};

afterEach(() => {
  mockAxios.reset();
});

test("should return user id on successful creation", async () => {
  const mockResponse: AxiosResponse<Response> = {
    data: {
      playerId: "abc123",
      token: "f7d01fef-cd47-496a-b7eb-5dd26f771721",
    },
    status: 201,
    statusText: "CREATED",
    headers: {},
    config: {},
  };

  mockAxios.post.mockImplementationOnce(
    () => Promise.resolve(mockResponse) as never
  );

  const res = await createPlayer(testPlayer);

  expect(mockAxios.post).toHaveBeenCalledTimes(1);
  expect(mockAxios.post).toHaveBeenCalledWith(`/api/player/create`, undefined, {
    params: testPlayer,
  });

  expect(res).toEqual({
    success: true,
    status: 201,
    data: {
      playerId: "abc123",
      token: "f7d01fef-cd47-496a-b7eb-5dd26f771721",
    },
  });
});

test("should return error on 400 bad request (invalid code or nickname)", async () => {
  const mockError: AxiosError<string> = {
    name: "error",
    message: "test message",
    config: {},
    response: {
      data: "invalid nickname",
      status: 400,
      statusText: "BAD REQUEST",
      headers: {},
      config: {},
    },
    isAxiosError: true,
    toJSON: () => ({}),
  };

  mockAxios.post.mockImplementationOnce(
    () => Promise.reject(mockError) as never
  );

  const res = await createPlayer(testPlayer);

  expect(mockAxios.post).toHaveBeenCalledTimes(1);
  expect(mockAxios.post).toHaveBeenCalledWith(`/api/player/create`, undefined, {
    params: testPlayer,
  });

  expect(res).toEqual({
    success: false,
    status: 400,
    error: "invalid nickname",
  });
});

test("should return error on 500 server error", async () => {
  const mockError: AxiosError<string> = {
    name: "error",
    message: "test message",
    config: {},
    request: "test request",
    isAxiosError: true,
    toJSON: () => ({}),
  };

  mockAxios.post.mockImplementationOnce(
    () => Promise.reject(mockError) as never
  );

  const res = await createPlayer(testPlayer);

  expect(mockAxios.post).toHaveBeenCalledTimes(1);
  expect(mockAxios.post).toHaveBeenCalledWith(`/api/player/create`, undefined, {
    params: testPlayer,
  });

  expect(res).toEqual({
    success: false,
    status: 500,
    error: "Server error, please try again.",
  });
});
